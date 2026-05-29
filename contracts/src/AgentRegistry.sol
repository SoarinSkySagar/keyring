// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IRegistrationWorkflows } from "./interfaces/story/IRegistrationWorkflows.sol";
import { WorkflowStructs }         from "./interfaces/story/WorkflowStructs.sol";
import { ISPGNFT }                  from "./interfaces/story/ISPGNFT.sol";
import { Ownable }                  from "@openzeppelin/contracts/access/Ownable.sol";

/// @title  AgentRegistry
/// @notice Registers AI agents as Story Protocol IP Assets. Stores the wallet→ipId
///         mapping so KeyringAccessCondition can resolve an agent's identity from
///         the address that calls CDR.
contract AgentRegistry is Ownable {
    // ─────────────────────────────────────────────────────────────── types ──

    struct Agent {
        address owner;     // Keyring user who whitelisted this agent
        address ipId;      // Story Protocol IP Account address (ERC-6551)
        address wallet;    // Ethereum wallet the agent uses to call CDR
        string  name;
        bool    active;
        uint256 createdAt;
    }

    // ──────────────────────────────────────────────────────────── constants ──

    /// Story Protocol Aeneid testnet addresses
    IRegistrationWorkflows public immutable REGISTRATION_WORKFLOWS;

    // ─────────────────────────────────────────────────────────────── state ──

    /// The Keyring SPGNFT collection, created once in the constructor.
    address public spgNft;

    /// ipId → Agent record
    mapping(address ipId => Agent) public agents;

    /// agent wallet → ipId  (used by KeyringAccessCondition for O(1) lookup)
    mapping(address wallet => address) public walletToIpId;

    /// owner → list of ipIds they have registered
    mapping(address owner => address[]) public ownerAgents;

    // ──────────────────────────────────────────────────────────────── events ──

    event AgentCreated(address indexed ipId, address indexed wallet, address indexed agentOwner, string name);
    event AgentDeleted(address indexed ipId);

    // ──────────────────────────────────────────────────────────────── errors ──

    error NotAgentOwner(address ipId);
    error AgentAlreadyRegistered(address wallet);
    error ZeroAddress();

    // ──────────────────────────────────────────────────────── constructor ──

    /// @param registrationWorkflows  Story Protocol RegistrationWorkflows address.
    /// @param collectionOwner        Address that owns the SPGNFT collection (usually deployer).
    constructor(
        address registrationWorkflows,
        address collectionOwner
    ) Ownable(collectionOwner) {
        if (registrationWorkflows == address(0)) revert ZeroAddress();
        REGISTRATION_WORKFLOWS = IRegistrationWorkflows(registrationWorkflows);

        // Create the Keyring SPGNFT collection once — all agents are minted from it.
        spgNft = REGISTRATION_WORKFLOWS.createCollection(
            ISPGNFT.InitParams({
                name: "Keyring Agents",
                symbol: "KRAG",
                baseURI: "",
                contractURI: "",
                maxSupply: type(uint32).max,
                mintFee: 0,
                mintFeeToken: address(0),
                mintFeeRecipient: address(0),
                owner: collectionOwner,
                mintOpen: true,
                isPublicMinting: false
            })
        );
    }

    // ────────────────────────────────────────────────── external write ──

    /// @notice Registers a new agent as a Story Protocol IP Asset.
    /// @param  name        Human-readable agent name (stored in IP metadata).
    /// @param  agentWallet The Ethereum address the agent will use to call CDR.
    /// @return ipId        The Story Protocol IP Account address for this agent.
    function createAgent(
        string calldata name,
        address agentWallet
    ) external returns (address ipId) {
        if (agentWallet == address(0)) revert ZeroAddress();
        if (walletToIpId[agentWallet] != address(0)) revert AgentAlreadyRegistered(agentWallet);

        uint256 tokenId;
        (ipId, tokenId) = REGISTRATION_WORKFLOWS.mintAndRegisterIp(
            spgNft,
            agentWallet, // NFT recipient = agent's wallet
            WorkflowStructs.IPMetadata({
                ipMetadataURI:  "",
                ipMetadataHash: bytes32(0),
                nftMetadataURI: "",
                nftMetadataHash: bytes32(0)
            }),
            true // allowDuplicates
        );

        agents[ipId] = Agent({
            owner: msg.sender,
            ipId: ipId,
            wallet: agentWallet,
            name: name,
            active: true,
            createdAt: block.timestamp
        });

        walletToIpId[agentWallet] = ipId;
        ownerAgents[msg.sender].push(ipId);

        emit AgentCreated(ipId, agentWallet, msg.sender, name);
    }

    /// @notice Permanently deletes an agent. Clears wallet mapping and marks inactive.
    /// @dev    The underlying IP Asset NFT cannot be burned from here — it remains on
    ///         Story Protocol — but Keyring treats the agent as gone: all CDR reads
    ///         will be denied and the wallet can be reregistered to a new agent.
    ///         Grant records in KeyringAccessCondition are not cleared here; they
    ///         become inert because isActiveAgent() returns false.
    function deleteAgent(address ipId) external {
        if (agents[ipId].owner != msg.sender) revert NotAgentOwner(ipId);

        address wallet = agents[ipId].wallet;
        delete walletToIpId[wallet];
        agents[ipId].active = false;

        emit AgentDeleted(ipId);
    }

    // ─────────────────────────────────────────────── external view ──

    /// @notice Returns the ipId bound to a wallet address (address(0) if not registered).
    function getIpId(address wallet) external view returns (address) {
        return walletToIpId[wallet];
    }

    /// @notice Returns true if the IP Asset is registered and currently active.
    function isActiveAgent(address ipId) external view returns (bool) {
        return agents[ipId].active;
    }

    /// @notice Returns all ipIds registered by a given owner.
    function getOwnerAgents(address agentOwner) external view returns (address[] memory) {
        return ownerAgents[agentOwner];
    }

    /// @notice Returns the full Agent struct for a given ipId.
    function getAgent(address ipId) external view returns (Agent memory) {
        return agents[ipId];
    }
}
