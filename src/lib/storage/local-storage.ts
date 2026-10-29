import fs from "fs";
import path from "path";

export interface StorageProvider {
  saveFile(buffer: Buffer, relativePath: string): Promise<string>;
  getFile(relativePath: string): Promise<Buffer>;
  deleteFile(relativePath: string): Promise<boolean>;
  getPublicUrl(relativePath: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    try {
      this.baseDir = baseDir || path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      const genDir = path.join(process.cwd(), "public", "generated");
      if (!fs.existsSync(genDir)) {
        fs.mkdirSync(genDir, { recursive: true });
      }
    } catch {
      // Fallback for read-only serverless lambdas (e.g. Vercel)
      this.baseDir = path.join("/tmp", "uploads");
    }
  }

  async saveFile(buffer: Buffer, relativePath: string): Promise<string> {
    try {
      const fullPath = path.join(process.cwd(), "public", relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(fullPath, buffer);
      return `/${relativePath.replace(/\\/g, "/")}`;
    } catch {
      // On serverless read-only filesystem, save to /tmp
      const tmpPath = path.join("/tmp", relativePath);
      const dir = path.dirname(tmpPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(tmpPath, buffer);
      return `/${relativePath.replace(/\\/g, "/")}`;
    }
  }

  async getFile(relativePath: string): Promise<Buffer> {
    // If it's a remote URL, fetch directly
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
      const res = await fetch(relativePath);
      if (!res.ok) throw new Error(`Failed to fetch file from ${relativePath}`);
      return Buffer.from(await res.arrayBuffer());
    }

    const cleanPath = relativePath.startsWith("/")
      ? relativePath.slice(1)
      : relativePath;

    // Check public first
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    if (fs.existsSync(fullPath)) {
      return await fs.promises.readFile(fullPath);
    }

    // Check /tmp fallback
    const tmpPath = path.join("/tmp", cleanPath);
    if (fs.existsSync(tmpPath)) {
      return await fs.promises.readFile(tmpPath);
    }

    throw new Error(`File not found: ${cleanPath}`);
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    const cleanPath = relativePath.startsWith("/")
      ? relativePath.slice(1)
      : relativePath;
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    const tmpPath = path.join("/tmp", cleanPath);
    if (fs.existsSync(tmpPath)) {
      await fs.promises.unlink(tmpPath);
      return true;
    }
    return false;
  }

  getPublicUrl(relativePath: string): string {
    const cleanPath = relativePath.startsWith("/")
      ? relativePath
      : `/${relativePath}`;
    return cleanPath.replace(/\\/g, "/");
  }
}

export const storage = new LocalStorageProvider();
