export type Role = "user" | "assistant" | "system";
export type FileKind = "image" | "pdf" | "text" | "video" | "other";

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: FileKind;
  /** Extracted text (documents, code, CSV, PDFs). */
  text?: string;
  /** Base64 data URL (images only). */
  dataUrl?: string;
  truncated?: boolean;
  /** Human-readable processing note (e.g. "video analysis not supported by provider"). */
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  model?: string;
  createdAt: number;
  feedback?: "up" | "down" | null;
  /** Safe, user-facing reasoning summary (never raw chain-of-thought). */
  summary?: string;
  error?: string;
  /** Agent Mode stage this message belongs to. */
  stage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  projectId?: string | null;
  model: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  instructions: string;
  files: Attachment[];
  createdAt: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  tagline: string;
  vision: boolean;
}

/** Public catalogue. Which backend serves each id is decided server-side (see lib/providers). */
export const MODELS: ModelInfo[] = [
  { id: "naveen-alpha", name: "NAVEEN ALPHA", tagline: "Advanced Reasoning", vision: true },
  { id: "naveen-alpha-fast", name: "NAVEEN ALPHA FAST", tagline: "Fast Responses", vision: true },
  { id: "naveen-vision", name: "NAVEEN VISION", tagline: "Image & Document Analysis", vision: true },
  { id: "naveen-code", name: "NAVEEN CODE", tagline: "Software Engineering", vision: false },
];

export const SUMMARY_MARKER = "<<SUMMARY>>";

export interface ModelStatus {
  id: string;
  configured: boolean;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
}

export interface StatusResponse {
  models: ModelStatus[];
  providers: { id: string; label: string; configured: boolean }[];
  limits: { maxUploadMB: number; rateLimitPerMin: number };
  persistence: { supabase: boolean };
}
