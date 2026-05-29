// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Interface that CDR calls on a read condition contract before releasing
///         partial decryption shares to the requester.
interface ICDRReadCondition {
    /// @param uuid          The vault UUID being read.
    /// @param accessAuxData Dynamic bytes supplied by the requester at read time.
    /// @param conditionData Static bytes baked into the vault at allocation time.
    /// @param caller        The address that submitted the CDR read request.
    /// @return              True to allow decryption, false to deny.
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}
