"use client";

import { useActionState } from "react";
import { createSpell } from "./actions";

const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  fontSize: "1rem",
  border: "1px solid #ccc",
  borderRadius: "6px",
  outline: "none",
};

const btn: React.CSSProperties = {
  padding: "10px 24px",
  fontSize: "1rem",
  fontWeight: 700,
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export function CreateForm() {
  const [state, action, pending] = useActionState(createSpell, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "420px" }}>
      <input name="phrase" placeholder="magic-phrase (no spaces)" required style={input} />
      <input name="secret" placeholder="secret value" required style={input} />
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button type="submit" disabled={pending} style={{ ...btn, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Creating…" : "Create"}
        </button>
        {state?.error && <span style={{ color: "red", fontSize: "0.9rem" }}>{state.error}</span>}
        {state?.success && <span style={{ color: "green", fontSize: "0.9rem" }}>Created!</span>}
      </div>
    </form>
  );
}
