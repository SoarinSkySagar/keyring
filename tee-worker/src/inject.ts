import type { Task } from "./types";

/**
 * Replace every {{SECRET_NAME}} placeholder with its plaintext value.
 * Placeholders with no matching secret are left untouched.
 */
export function injectSecrets(template: string, secrets: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in secrets ? secrets[name]! : match,
  );
}

/**
 * Replace any literal occurrence of a secret's plaintext value with its
 * {{SECRET_NAME}} placeholder. Used to scrub a sloppy caller's inlined secrets
 * before the task is ever shown to the (remote) Gemini judge. Uses split/join
 * so secret values containing regex metacharacters are handled safely.
 */
export function redactSecrets(text: string, secrets: Record<string, string>): string {
  let out = text;
  for (const [name, value] of Object.entries(secrets)) {
    if (!value) continue; // never redact on an empty value
    out = out.split(value).join(`{{${name}}}`);
  }
  return out;
}

function mapTaskStrings(task: Task, fn: (s: string) => string): Task {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(task.headers ?? {})) headers[k] = fn(v);
  return {
    method: task.method,
    url: fn(task.url),
    headers,
    body: task.body != null ? fn(task.body) : task.body,
  };
}

/** Inject real secret values into a task's url, header values, and body. */
export function injectTask(task: Task, secrets: Record<string, string>): Task {
  return mapTaskStrings(task, (s) => injectSecrets(s, secrets));
}

/** Scrub any inlined plaintext secrets from a task's url, header values, and body. */
export function redactTask(task: Task, secrets: Record<string, string>): Task {
  return mapTaskStrings(task, (s) => redactSecrets(s, secrets));
}
