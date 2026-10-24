import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage/local-storage";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findFirst({
      where: { id: params.eventId, authorId: session.userId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    // Size limit 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image file exceeds maximum limit of 10MB." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".svg"].includes(ext)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, and SVG images are supported as certificate backgrounds." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `template_${params.eventId}_${Date.now()}${ext}`;
    const relativePath = path.join("uploads", filename);

    const publicUrl = await storage.saveFile(buffer, relativePath);

    return NextResponse.json({
      message: "Template background uploaded successfully",
      backgroundUrl: publicUrl,
    });
  } catch (error: any) {
    console.error("Upload background error:", error);
    return NextResponse.json(
      { error: "Failed to upload template background" },
      { status: 500 }
    );
  }
}
