import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
  from?: string;
}

export interface SendEmailOptions {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  smtpConfig?: SmtpConfig;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
  previewUrl?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

/**
 * Real SMTP Email Provider via Nodemailer (supports Gmail, Outlook, Resend, SendGrid, custom SMTP)
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private defaultSmtpConfig?: SmtpConfig;

  constructor(defaultConfig?: SmtpConfig) {
    this.defaultSmtpConfig = defaultConfig;
  }

  private getTransporter(customConfig?: SmtpConfig): Transporter {
    const config = customConfig || this.defaultSmtpConfig;
    if (config) {
      const host = config.host || "smtp.gmail.com";
      const port = Number(config.port) || 587;
      const secure = config.secure ?? (port === 465);
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: config.user, pass: config.pass },
      });
    }

    if (!this.transporter) {
      const host = process.env.SMTP_HOST || "smtp.gmail.com";
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === "true" || port === 465;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const transporter = this.getTransporter(options.smtpConfig);
      const from =
        options.from ||
        options.smtpConfig?.from ||
        (options.smtpConfig?.user ? `"${options.smtpConfig.user.split('@')[0]}" <${options.smtpConfig.user}>` : undefined) ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        `"CertifyFlow" <noreply@certifyflow.com>`;

      const info = await transporter.sendMail({
        from,
        to: options.to,
        replyTo: options.replyTo || (options.smtpConfig?.user ? options.smtpConfig.user : undefined),
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      console.log(`[Email Delivered] From: ${from} | To: ${options.to} | MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error(`[Email Delivery Failed] To: ${options.to}`, err);
      return {
        success: false,
        errorMessage: err.message || "Failed to dispatch email via SMTP provider",
      };
    }
  }
}

/**
 * Resend HTTP API Email Provider (optional if RESEND_API_KEY is provided)
 */
export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from?: string) {
    this.apiKey = apiKey;
    this.from = from || process.env.RESEND_FROM || "Certificates <onboarding@resend.dev>";
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content.toString("base64"),
      }));

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API error: ${res.statusText}`);
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (err: any) {
      console.error(`[Resend Error] To: ${options.to}`, err);
      return {
        success: false,
        errorMessage: err.message || "Failed to send email via Resend",
      };
    }
  }
}

/**
 * Mock Email Provider for local development & automated tests
 */
export class MockEmailProvider implements EmailProvider {
  private sentEmails: Array<{
    to: string;
    subject: string;
    sentAt: Date;
    attachmentCount: number;
  }> = [];

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    if (options.to.includes("testfail") || options.to.includes("invalid-bounce")) {
      return {
        success: false,
        errorMessage: "550 5.1.1 Recipient mailbox unavailable / simulated SMTP bounce error",
      };
    }

    this.sentEmails.push({
      to: options.to,
      subject: options.subject,
      sentAt: new Date(),
      attachmentCount: options.attachments?.length || 0,
    });

    console.log(`[Mock Email Sent] To: ${options.to} | Subject: "${options.subject}" (Attachments: ${options.attachments?.length || 0})`);

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  getSentCount(): number {
    return this.sentEmails.length;
  }
}

/**
 * Factory to determine active email provider based on environment variables
 */
function createEmailService(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    console.log("Using Resend Email Provider");
    return new ResendEmailProvider(process.env.RESEND_API_KEY);
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`Using Real SMTP Email Provider (${process.env.SMTP_HOST || "smtp.gmail.com"})`);
    return new SmtpEmailProvider();
  }

  return new MockEmailProvider();
}

export class DynamicEmailService implements EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (options.smtpConfig?.user && options.smtpConfig?.pass) {
      const provider = new SmtpEmailProvider(options.smtpConfig);
      return provider.sendEmail(options);
    }
    const provider = createEmailService();
    return provider.sendEmail(options);
  }
}

export const emailService: EmailProvider = new DynamicEmailService();
