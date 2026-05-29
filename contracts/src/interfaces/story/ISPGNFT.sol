// SPDX-License-Identifier: MIT
// Minimal stub — only the InitParams struct used by AgentRegistry.
pragma solidity ^0.8.26;

interface ISPGNFT {
    struct InitParams {
        string name;
        string symbol;
        string baseURI;
        string contractURI;
        uint32 maxSupply;
        uint256 mintFee;
        address mintFeeToken;
        address mintFeeRecipient;
        address owner;
        bool mintOpen;
        bool isPublicMinting;
    }
}
