// ─────────────────────────────────────────────────────────────────────────────
// Keyring smart contract ABIs, bytecodes and network constants.
//
// Bytecodes are extracted from contracts/out/ after `forge build`.
// Re-extract and update here whenever contracts change.
// ─────────────────────────────────────────────────────────────────────────────

// ── Network constants ────────────────────────────────────────────────────────

/** Story Protocol Aeneid testnet — RegistrationWorkflows (SPG) */
export const REGISTRATION_WORKFLOWS_ADDRESS =
  "0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424" as const;

/** KeyringFactory — deployed once by Keyring, address set after deployment */
export const KEYRING_FACTORY_ADDRESS = (
  process.env.NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS ?? ""
) as `0x${string}`;

// ── KeyringFactory ───────────────────────────────────────────────────────────

export const KeyringFactoryABI = [
  {
    type: "constructor",
    inputs: [
      { name: "registrationWorkflows", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "REGISTRATION_WORKFLOWS",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deploy",
    inputs: [],
    outputs: [
      { name: "registry", type: "address", internalType: "address" },
      { name: "condition", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "RegistryDeployed",
    inputs: [
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "registry", type: "address", indexed: true, internalType: "address" },
      { name: "condition", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;

// ── AgentRegistry ────────────────────────────────────────────────────────────

export const AgentRegistryABI = [
  {
    type: "constructor",
    inputs: [
      { name: "registrationWorkflows", type: "address", internalType: "address" },
      { name: "owner_", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "REGISTRATION_WORKFLOWS",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IRegistrationWorkflows" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agents",
    inputs: [{ name: "ipId", type: "address", internalType: "address" }],
    outputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "ipId", type: "address", internalType: "address" },
      { name: "wallet", type: "address", internalType: "address" },
      { name: "name", type: "string", internalType: "string" },
      { name: "active", type: "bool", internalType: "bool" },
      { name: "createdAt", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createAgent",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "agentWallet", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "ipId", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deleteAgent",
    inputs: [{ name: "ipId", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAgent",
    inputs: [{ name: "ipId", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct AgentRegistry.Agent",
        components: [
          { name: "owner", type: "address", internalType: "address" },
          { name: "ipId", type: "address", internalType: "address" },
          { name: "wallet", type: "address", internalType: "address" },
          { name: "name", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
          { name: "createdAt", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getIpId",
    inputs: [{ name: "wallet", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOwnerAgents",
    inputs: [{ name: "agentOwner", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isActiveAgent",
    inputs: [{ name: "ipId", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "spgNft",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "walletToIpId",
    inputs: [{ name: "wallet", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AgentCreated",
    inputs: [
      { name: "ipId", type: "address", indexed: true, internalType: "address" },
      { name: "wallet", type: "address", indexed: true, internalType: "address" },
      { name: "agentOwner", type: "address", indexed: true, internalType: "address" },
      { name: "name", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AgentDeleted",
    inputs: [
      { name: "ipId", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
      { name: "newOwner", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AgentAlreadyRegistered",
    inputs: [{ name: "wallet", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NotAgentOwner",
    inputs: [{ name: "ipId", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;

// ── KeyringAccessCondition ───────────────────────────────────────────────────

export const KeyringAccessConditionABI = [
  {
    type: "constructor",
    inputs: [
      { name: "agentRegistry_", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "REGISTRY",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IAgentRegistry" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "checkReadCondition",
    inputs: [
      { name: "uuid", type: "uint32", internalType: "uint32" },
      { name: "", type: "bytes", internalType: "bytes" },
      { name: "", type: "bytes", internalType: "bytes" },
      { name: "caller", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantAccess",
    inputs: [
      { name: "uuid", type: "uint32", internalType: "uint32" },
      { name: "ipId", type: "address", internalType: "address" },
      { name: "expiresAt", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grants",
    inputs: [
      { name: "uuid", type: "uint32", internalType: "uint32" },
      { name: "ipId", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "active", type: "bool", internalType: "bool" },
      { name: "expiresAt", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerVault",
    inputs: [{ name: "uuid", type: "uint32", internalType: "uint32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeAccess",
    inputs: [
      { name: "uuid", type: "uint32", internalType: "uint32" },
      { name: "ipId", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vaultOwner",
    inputs: [{ name: "uuid", type: "uint32", internalType: "uint32" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AccessGranted",
    inputs: [
      { name: "uuid", type: "uint32", indexed: true, internalType: "uint32" },
      { name: "ipId", type: "address", indexed: true, internalType: "address" },
      { name: "expiresAt", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AccessRevoked",
    inputs: [
      { name: "uuid", type: "uint32", indexed: true, internalType: "uint32" },
      { name: "ipId", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "VaultRegistered",
    inputs: [
      { name: "uuid", type: "uint32", indexed: true, internalType: "uint32" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "NotVaultOwner",
    inputs: [{ name: "uuid", type: "uint32", internalType: "uint32" }],
  },
  {
    type: "error",
    name: "VaultNotRegistered",
    inputs: [{ name: "uuid", type: "uint32", internalType: "uint32" }],
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;
