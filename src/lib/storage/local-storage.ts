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
    this.baseDir = baseDir || path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    // Also ensure generated directory exists
    const genDir = path.join(process.cwd(), "public", "generated");
    if (!fs.existsSync(genDir)) {
      fs.mkdirSync(genDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, relativePath: string): Promise<string> {
    const fullPath = path.join(process.cwd(), "public", relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
    return `/${relativePath.replace(/\\/g, "/")}`;
  }

  async getFile(relativePath: string): Promise<Buffer> {
    const cleanPath = relativePath.startsWith("/")
      ? relativePath.slice(1)
      : relativePath;
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    return await fs.promises.readFile(fullPath);
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
