import { createHash } from "node:crypto";
import { DstackClient } from "@phala/dstack-sdk";
import type { Attestation } from "./types";

// One client per process. Constructed lazily so importing this module never
// touches the dstack socket. In production DSTACK_SIMULATOR_ENDPOINT is unset
// and the SDK falls back to the real /var/run/dstack.sock.
let cachedClient: DstackClient | null = null;
function client(): DstackClient {
  if (!cachedClient) cachedClient = new DstackClient(process.env.DSTACK_SIMULATOR_ENDPOINT);
  return cachedClient;
}

/** sha256 → 32 bytes, comfortably within dstack's 64-byte report-data limit. */
function reportDataFor(payload: unknown): Buffer {
  return createHash("sha256").update(JSON.stringify(payload)).digest();
}

/**
 * Produce a TDX attestation quote binding `payload` (the verdict) to this
 * enclave. Returns null when the dstack socket is unavailable — attestation is
 * evidence, never a gate on execution.
 */
export async function attest(payload: unknown): Promise<Attestation | null> {
  try {
    const c = client();
    const reportData = reportDataFor(payload);
    const quote = await c.getQuote(reportData);
    const info = await c.info().catch(() => null);
    return {
      quote: quote.quote,
      eventLog: quote.event_log,
      reportData: reportData.toString("hex"),
      appId: info?.app_id,
      instanceId: info?.instance_id,
    };
  } catch {
    return null;
  }
}

/**
 * Identity check used by GET /attestation and GET /health. Note: the SDK's
 * isReachable() gives false negatives against the simulator, so we probe with
 * info() instead.
 */
export async function attestationInfo(): Promise<{
  reachable: boolean;
  appId?: string;
  instanceId?: string;
  quote?: string;
}> {
  try {
    const c = client();
    const info = await c.info();
    const quote = await c.getQuote(reportDataFor("keyring-tee-worker")).catch(() => null);
    return {
      reachable: true,
      appId: info.app_id,
      instanceId: info.instance_id,
      quote: quote?.quote,
    };
  } catch {
    return { reachable: false };
  }
}
