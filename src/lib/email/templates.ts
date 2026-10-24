export interface EmailTemplateData {
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateData = {
  subject: "Your Certificate for {{event_name}}",
  body: `Dear {{name}},

Congratulations on participating in {{event_name}}, organized by {{organizer}}!

Your official personalized certificate has been generated and is attached to this email as a PDF document.

Certificate Details:
- Recipient: {{name}}
- Event: {{event_name}}
- Date: {{date}}
- Certificate Verification ID: {{certificate_uid}}

Thank you for your enthusiastic participation and dedication!

Warm regards,
{{organizer}}`,
};

export function interpolateEmail(
  templateString: string,
  variables: Record<string, string>
): string {
  let result = templateString;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

export function formatHtmlEmail(plainTextBody: string): string {
  const paragraphs = plainTextBody
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    ${paragraphs}
    <div class="footer">
      This is an automated certificate delivery sent via CertifyFlow.
    </div>
  </div>
</body>
</html>
  `;
}
