const SECRET_KEY = process.env.DEMO_SECRET_KEY ?? "dsk_demo_keyring_2026_abc123";

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed\n");
  }

  const auth = req.headers["authorization"];
  if (!auth || auth !== `Bearer ${SECRET_KEY}`) {
    return res.status(401).send("401 Unauthorized — wrong or missing secret key\n");
  }

  res.status(200).send(
    "Hello from the Keyring demo server!\n" +
    "Your secret was unlocked from a CDR vault, judged by an AI policy enforcer\n" +
    "running inside a TDX enclave, injected in-enclave, and used to call this\n" +
    "server — the plaintext key never passed through Gemini.\n"
  );
};
