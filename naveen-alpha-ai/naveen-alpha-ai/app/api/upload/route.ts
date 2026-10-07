import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ALLOWED_IMAGE,
  ALLOWED_TEXT_EXT,
  ALLOWED_VIDEO,
  clientIp,
  isPdf,
  limits,
  looksLikeText,
  rateLimit,
  sanitizeText,
  sniffImage,
} from "@/lib/server/security";
import type { Attachment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_INLINE_MAX = 8 * 1024 * 1024;

function ext(name: string) {
  const base = name.toLowerCase().split("/").pop() ?? "";
  const i = base.lastIndexOf(".");
  return i === -1 ? base : base.slice(i + 1);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`upload:${clientIp(req)}`, 20);
  if (!rl.ok) return NextResponse.json({ error: `Too many uploads. Try again in ${rl.retryAfter}s.` }, { status: 429 });

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > limits.maxUploadBytes() + 64 * 1024)
    return NextResponse.json({ error: `File too large (max ${limits.maxUploadBytes() / 1024 / 1024} MB)` }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (file.size > limits.maxUploadBytes())
    return NextResponse.json({ error: `File too large (max ${limits.maxUploadBytes() / 1024 / 1024} MB)` }, { status: 413 });

  const name = sanitizeText(file.name, 200).replace(/[\\/]/g, "_") || "file";
  const e = ext(name);
  const buf = Buffer.from(await file.arrayBuffer());
  const att: Attachment = { id: randomUUID(), name, mime: file.type || "application/octet-stream", size: file.size, kind: "other" };

  // Uploaded content is only ever read as data. Nothing is executed.
  const imageMime = sniffImage(buf);
  if (imageMime) {
    if (!ALLOWED_IMAGE.has(imageMime)) return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    if (buf.length > IMAGE_INLINE_MAX) return NextResponse.json({ error: "Image too large (max 8 MB). Resize it and try again." }, { status: 413 });
    att.kind = "image";
    att.mime = imageMime;
    att.dataUrl = `data:${imageMime};base64,${buf.toString("base64")}`;
    return NextResponse.json({ attachment: att });
  }

  if (isPdf(buf)) {
    att.kind = "pdf";
    att.mime = "application/pdf";
    try {
      // Import the implementation directly: the package index runs a debug routine on import.
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (b: Buffer) => Promise<{ text: string; numpages: number }>;
      const parsed = await pdfParse(buf);
      let text = (parsed.text || "").replace(/\u0000/g, "").trim();
      if (!text) {
        att.note = "No extractable text (scanned PDF?). Upload page images instead.";
      } else {
        if (text.length > limits.maxExtractedChars) {
          text = text.slice(0, limits.maxExtractedChars);
          att.truncated = true;
        }
        att.text = text;
        att.note = `${parsed.numpages} page${parsed.numpages === 1 ? "" : "s"}`;
      }
    } catch {
      return NextResponse.json({ error: "Could not read this PDF (corrupt or password-protected)." }, { status: 422 });
    }
    return NextResponse.json({ attachment: att });
  }

  if (ALLOWED_VIDEO.has(file.type) || ["mp4", "webm", "mov"].includes(e)) {
    att.kind = "video";
    att.note = "Video attached. Frame-level analysis depends on the configured provider; the model receives only the file name.";
    return NextResponse.json({ attachment: att });
  }

  if (ALLOWED_TEXT_EXT.has(e) || file.type.startsWith("text/") || file.type === "application/json") {
    if (!looksLikeText(buf)) return NextResponse.json({ error: "File does not appear to be text" }, { status: 415 });
    let text = buf.toString("utf8").replace(/\u0000/g, "");
    if (text.length > limits.maxExtractedChars) {
      text = text.slice(0, limits.maxExtractedChars);
      att.truncated = true;
    }
    att.kind = "text";
    att.text = text;
    if (!att.mime || att.mime === "application/octet-stream") att.mime = "text/plain";
    return NextResponse.json({ attachment: att });
  }

  return NextResponse.json(
    { error: `Unsupported file type ".${e}". Supported: images, PDF, text/CSV/JSON, source code, and video (metadata only).` },
    { status: 415 }
  );
}
