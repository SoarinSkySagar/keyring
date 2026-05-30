// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Interface that the CDR precompile calls on a read-condition contract
///         before releasing partial-decryption shares to the requester.
///
/// Actual CDR on-chain signature (4-param, from Story Protocol docs):
///   checkReadCondition(uint32 uuid, bytes accessAuxData, bytes conditionData, address caller)
///
/// - uuid           : CDR vault identifier
/// - accessAuxData  : dynamic bytes the requester supplies at read time
/// - conditionData  : static bytes baked into the vault at allocation time
/// - caller         : msg.sender that called CDR.read()
interface ICDRReadCondition {
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}
