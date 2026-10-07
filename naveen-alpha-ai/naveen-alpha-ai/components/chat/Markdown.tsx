"use client";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

function MarkdownImpl({ text }: { text: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const src = String(children ?? "");
            const m = /language-([\w+#-]+)/.exec(className ?? "");
            if (!m && !src.includes("\n")) return <code className="inline">{children}</code>;
            return <CodeBlock code={src.replace(/\n$/, "")} lang={m?.[1] ?? ""} />;
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
          ),
          // Remote images are blocked on purpose: a malicious document could otherwise smuggle data out via an image URL.
          img: ({ alt }) => <span className="text-mute">[image: {alt || "blocked"}]</span>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
