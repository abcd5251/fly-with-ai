// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HoldEscrow
 * @notice Escrow for refundable seat-hold deposits.
 *
 * An AI travel agent buys a short-lived option on a seat. Two payments leave
 * its wallet and they behave differently:
 *
 *   - the hold fee goes straight to the airline over x402 and never comes back;
 *   - the deposit is locked here, and leaves by exactly one of three doors:
 *       settle()  the traveller books  -> credited to the seller
 *       refund()  the traveller passes -> returned to the payer
 *       refund()  after expiry         -> returned to the payer, callable by anyone
 *
 * The seller can never pull funds and the contract has no owner, no pause and
 * no upgrade path: after expiry the deposit is returnable by any caller, so a
 * seller that goes offline cannot strand a traveller's money.
 *
 * Deposits are short-lived and high-velocity by design — every seat an agent
 * holds parks value on the network for the length of the hold window.
 */
contract HoldEscrow {
    enum Status {
        None,
        Held,
        Settled,
        Refunded
    }

    struct Hold {
        address payer;
        address seller;
        uint256 deposit;
        uint64 expiresAt;
        Status status;
    }

    /// @dev keccak256 of the seller's holdId, so off-chain ids stay opaque here.
    mapping(bytes32 => Hold) public holds;

    /// @notice Deposits currently locked — the contract's live TVL.
    uint256 public totalLocked;
    /// @notice Lifetime deposits credited to sellers at booking.
    uint256 public totalSettled;
    /// @notice Lifetime deposits returned to payers.
    uint256 public totalRefunded;
    /// @notice Lifetime number of holds opened.
    uint64 public holdsOpened;

    uint64 public constant MAX_WINDOW = 7 days;

    event Opened(
        bytes32 indexed id,
        address indexed payer,
        address indexed seller,
        uint256 deposit,
        uint64 expiresAt
    );
    event Settled(bytes32 indexed id, address indexed seller, uint256 deposit);
    event Refunded(bytes32 indexed id, address indexed payer, uint256 deposit, bool byTimeout);

    error AlreadyExists();
    error NotHeld();
    error NotAuthorised();
    error ZeroDeposit();
    error BadWindow();
    error TransferFailed();

    /// @notice Lock a deposit against a hold id until `expiresAt`.
    function open(bytes32 id, address seller, uint64 expiresAt) external payable {
        if (holds[id].status != Status.None) revert AlreadyExists();
        if (msg.value == 0) revert ZeroDeposit();
        if (seller == address(0)) revert NotAuthorised();
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_WINDOW) {
            revert BadWindow();
        }

        holds[id] = Hold({
            payer: msg.sender,
            seller: seller,
            deposit: msg.value,
            expiresAt: expiresAt,
            status: Status.Held
        });

        totalLocked += msg.value;
        unchecked {
            holdsOpened += 1;
        }

        emit Opened(id, msg.sender, seller, msg.value, expiresAt);
    }

    /// @notice Traveller booked: credit the deposit to the seller.
    /// @dev Only the payer can release funds to the seller, and only before expiry.
    function settle(bytes32 id) external {
        Hold storage h = holds[id];
        if (h.status != Status.Held) revert NotHeld();
        if (msg.sender != h.payer) revert NotAuthorised();
        if (block.timestamp >= h.expiresAt) revert BadWindow();

        uint256 amount = h.deposit;
        address seller = h.seller;

        h.status = Status.Settled;
        h.deposit = 0;
        totalLocked -= amount;
        totalSettled += amount;

        emit Settled(id, seller, amount);
        _send(seller, amount);
    }

    /// @notice Return the deposit. The payer may call any time; after expiry
    /// anyone may call, so the money comes home without the seller's help.
    function refund(bytes32 id) external {
        Hold storage h = holds[id];
        if (h.status != Status.Held) revert NotHeld();

        bool byTimeout = block.timestamp >= h.expiresAt;
        if (!byTimeout && msg.sender != h.payer) revert NotAuthorised();

        uint256 amount = h.deposit;
        address payer = h.payer;

        h.status = Status.Refunded;
        h.deposit = 0;
        totalLocked -= amount;
        totalRefunded += amount;

        emit Refunded(id, payer, amount, byTimeout);
        _send(payer, amount);
    }

    /// @notice Everything a UI needs about one hold in a single call.
    function holdOf(
        bytes32 id
    )
        external
        view
        returns (
            address payer,
            address seller,
            uint256 deposit,
            uint64 expiresAt,
            Status status,
            bool refundable
        )
    {
        Hold memory h = holds[id];
        return (
            h.payer,
            h.seller,
            h.deposit,
            h.expiresAt,
            h.status,
            h.status == Status.Held && block.timestamp >= h.expiresAt
        );
    }

    /// @notice Vault headline numbers for the dashboard.
    function stats()
        external
        view
        returns (uint256 locked, uint256 settled, uint256 refunded, uint64 opened)
    {
        return (totalLocked, totalSettled, totalRefunded, holdsOpened);
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
