// SPDX-License-Identifier: MIT
// Minimal stub — only createCollection + mintAndRegisterIp used by AgentRegistry.
pragma solidity ^0.8.26;

import { ISPGNFT }         from "./ISPGNFT.sol";
import { WorkflowStructs } from "./WorkflowStructs.sol";

interface IRegistrationWorkflows {
    function createCollection(ISPGNFT.InitParams calldata spgNftInitParams)
        external returns (address spgNftContract);

    function mintAndRegisterIp(
        address spgNftContract,
        address recipient,
        WorkflowStructs.IPMetadata calldata ipMetadata,
        bool allowDuplicates
    ) external returns (address ipId, uint256 tokenId);
}
