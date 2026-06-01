import "dotenv/config";
import { createApp } from "./server";

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  const mode = process.env.DSTACK_SIMULATOR_ENDPOINT ? "simulator" : "enclave";
  console.log(`[keyring-tee-worker] listening on :${port} (dstack: ${mode})`);
});
