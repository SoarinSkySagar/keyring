// Keyring end-to-end demo server — pure Node.js, no dependencies.
//
// Exposes one endpoint that requires a secret key in the Authorization header.
// The Keyring TEE injects the real key from the CDR vault; this server never
// receives the key directly from the caller — the TEE does the injection.
//
// Start: node demo-server.js
// Secret to store in Keyring: DEMO_KEY = dsk_demo_keyring_2026_abc123

const http = require("http");

const SECRET_KEY = "dsk_demo_keyring_2026_abc123";
const PORT = 4000;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/hello") {
    const auth = req.headers["authorization"];
    if (!auth || auth !== `Bearer ${SECRET_KEY}`) {
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("401 Unauthorized — wrong or missing secret key\n");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(
      "Hello from the Keyring demo server!\n" +
      "Your secret was unlocked from a CDR vault, judged by an AI policy enforcer\n" +
      "running inside a TDX enclave, injected in-enclave, and used to call this\n" +
      "server — the plaintext key never passed through Gemini.\n",
    );
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Demo server listening on :${PORT}`);
  console.log(`Endpoint: GET http://localhost:${PORT}/hello`);
  console.log(`Expected key: ${SECRET_KEY}`);
});
