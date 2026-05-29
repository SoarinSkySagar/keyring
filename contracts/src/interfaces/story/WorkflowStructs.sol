// SPDX-License-Identifier: MIT
// Minimal stub — only the IPMetadata struct used by AgentRegistry.
pragma solidity ^0.8.26;

library WorkflowStructs {
    struct IPMetadata {
        string ipMetadataURI;
        bytes32 ipMetadataHash;
        string nftMetadataURI;
        bytes32 nftMetadataHash;
    }
}
