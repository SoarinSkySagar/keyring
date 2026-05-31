"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      style={{
        flexShrink: 0,
        padding: "4px 10px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: copied ? "#000" : "#f4f4f4",
        color: copied ? "#fff" : "#333",
        border: "1px solid #ddd",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeRow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <code
        style={{
          flex: 1,
          fontFamily: "monospace",
          fontSize: "0.85rem",
          background: "#f4f4f4",
          padding: "6px 10px",
          borderRadius: "4px",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </code>
      <CopyButton text={text} />
    </div>
  );
}

export function PhraseList({ phrases }: { phrases: string[] }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (phrases.length === 0) {
    return <p style={{ color: "#999" }}>No spells yet.</p>;
  }

  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
      {phrases.map((phrase) => {
        const url = `${origin}/api/${phrase}`;
        const curl = `curl ${url}`;
        return (
          <li
            key={phrase}
            style={{
              padding: "12px 14px",
              border: "1px solid #e5e5e5",
              borderRadius: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "#888", fontFamily: "system-ui, sans-serif" }}>
                {phrase}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.8rem", color: "#555", textDecoration: "none", fontFamily: "system-ui, sans-serif" }}
              >
                test →
              </a>
            </div>
            <CodeRow text={url} />
            <CodeRow text={curl} />
          </li>
        );
      })}
    </ul>
  );
}
