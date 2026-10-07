const buckets = new Map<string, number[]>();

export const limits = {
  rateLimitPerMin: () => Math.max(1, Number(process.env.RATE_LIMIT_PER_MIN) || 30),
  maxUploadBytes: () => Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 20) * 1024 * 1024,
  maxMessages: 60,
  maxMessageChars: 400_000,
  maxTotalChars: 900_000,
  maxExtractedChars: 400_000,
};

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

/** In-memory sliding window limiter. Swap for Redis/Upstash when running on multiple instances. */
export function rateLimit(key: string, perMin = limits.rateLimitPerMin()): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= perMin) {
    buckets.set(key, arr);
    return { ok: false, retryAfter: Math.ceil((60_000 - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 60_000) buckets.delete(k);
  return { ok: true, retryAfter: 0 };
}

/** Strip control characters (keeps \n \t) and cap length. */
export function sanitizeText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}

export const ALLOWED_TEXT_EXT = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "jsonl", "xml", "yaml", "yml", "toml", "ini", "log", "sql", "html", "htm", "css",
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "java", "c", "h", "cpp", "hpp", "cs", "go", "rs", "rb", "php", "swift", "kt", "sh", "bash",
  "ps1", "r", "scala", "lua", "dart", "vue", "svelte", "env", "gitignore", "dockerfile", "tex", "rtf",
]);
export const ALLOWED_IMAGE = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function sniffImage(buf: Buffer): string | null {
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.length > 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString("latin1"))) return "image/gif";
  return null;
}

export function isPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** Heuristic: reject binary content masquerading as text. */
export function looksLikeText(buf: Buffer): boolean {
  const n = Math.min(buf.length, 8000);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const b = buf[i];
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) bad++;
  }
  return bad / Math.max(n, 1) < 0.02;
}
