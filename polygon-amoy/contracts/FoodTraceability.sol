// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Food supply-chain traceability on Polygon Amoy.
 * Mirrors the Fabric foodtrace chaincode: register → events → contamination/recall.
 */
contract FoodTraceability {
    bytes32 public constant GENESIS_PREV_HASH = bytes32(0);

    enum Stage {
        ORIGIN,
        PROCESSOR,
        DISTRIBUTOR,
        WALMART_STORE,
        CUSTOMER_SALE,
        STATUS_CHANGE
    }

    enum Status {
        SAFE,
        CONTAMINATED,
        RECALLED
    }

    enum Role {
        NONE,
        FARM,
        PROCESSOR,
        DISTRIBUTOR,
        STORE_ADMIN,
        AUDITOR
    }

    struct Batch {
        string batchId;
        string product;
        Status status;
        string originActor;
        string originLocation;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 eventCount;
        string contaminationReason;
        uint256 contaminationTimestamp;
        bytes32 latestHash;
        bool exists;
    }

    struct TraceEvent {
        string eventId;
        string batchId;
        uint256 index;
        Stage stage;
        string actor;
        string actorOrg;
        string location;
        uint256 timestamp;
        string detailsJson;
        bytes32 previousHash;
        bytes32 hash;
        bytes32 txHash;
    }

    struct Recall {
        string recallId;
        string batchId;
        string reason;
        string severity;
        Status status;
        uint256 generatedAt;
        uint256 touchpointCount;
        bool exists;
    }

    address public owner;

    mapping(address => uint256) public roleMask; // bit flags per Role enum
    mapping(string => Batch) private batches;
    mapping(string => TraceEvent[]) private batchEvents;
    mapping(string => Recall) private recalls;

    string[] private batchIds;
    string[] private recallIds;

    event BatchRegistered(string indexed batchId, string product, address indexed registrar, bytes32 hash);
    event EventAppended(string indexed batchId, Stage stage, uint256 index, bytes32 hash);
    event ContaminationFlagged(string indexed batchId, string reason, string recallId);
    event RoleAssigned(address indexed account, Role role);

    error Unauthorized();
    error BatchExists();
    error BatchNotFound();
    error InvalidInput();
    error AlreadyContaminated();
    error BadStage();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        // Deployer gets farm + store admin so one funded key can demo the full flow
        roleMask[msg.sender] = (1 << uint256(Role.FARM)) | (1 << uint256(Role.STORE_ADMIN));
        emit RoleAssigned(msg.sender, Role.FARM);
        emit RoleAssigned(msg.sender, Role.STORE_ADMIN);
    }

    function _hasRole(address account, Role role) internal view returns (bool) {
        return (roleMask[account] & (1 << uint256(role))) != 0;
    }

    function assignRole(address account, Role role) external onlyOwner {
        roleMask[account] |= (1 << uint256(role));
        emit RoleAssigned(account, role);
    }

    function revokeRole(address account, Role role) external onlyOwner {
        roleMask[account] &= ~(1 << uint256(role));
    }

    function primaryRole(address account) public view returns (Role) {
        if (_hasRole(account, Role.STORE_ADMIN)) return Role.STORE_ADMIN;
        if (_hasRole(account, Role.DISTRIBUTOR)) return Role.DISTRIBUTOR;
        if (_hasRole(account, Role.PROCESSOR)) return Role.PROCESSOR;
        if (_hasRole(account, Role.FARM)) return Role.FARM;
        if (_hasRole(account, Role.AUDITOR)) return Role.AUDITOR;
        return Role.NONE;
    }

    function registerBatch(
        string calldata batchId,
        string calldata product,
        string calldata originActor,
        string calldata originLocation,
        string calldata detailsJson
    ) external returns (bytes32 hash) {
        if (!_hasRole(msg.sender, Role.FARM)) revert Unauthorized();
        if (bytes(batchId).length == 0 || bytes(product).length == 0) revert InvalidInput();
        if (bytes(originActor).length == 0 || bytes(originLocation).length == 0) revert InvalidInput();
        if (batches[batchId].exists) revert BatchExists();

        uint256 ts = block.timestamp;
        TraceEvent memory ev = TraceEvent({
            eventId: string.concat(batchId, "-0"),
            batchId: batchId,
            index: 0,
            stage: Stage.ORIGIN,
            actor: originActor,
            actorOrg: "FarmOrg",
            location: originLocation,
            timestamp: ts,
            detailsJson: detailsJson,
            previousHash: GENESIS_PREV_HASH,
            hash: bytes32(0),
            txHash: bytes32(0)
        });
        hash = _hashEvent(ev);
        ev.hash = hash;
        ev.txHash = blockhash(block.number - 1);

        batches[batchId] = Batch({
            batchId: batchId,
            product: product,
            status: Status.SAFE,
            originActor: originActor,
            originLocation: originLocation,
            createdAt: ts,
            updatedAt: ts,
            eventCount: 1,
            contaminationReason: "",
            contaminationTimestamp: 0,
            latestHash: hash,
            exists: true
        });
        batchEvents[batchId].push(ev);
        batchIds.push(batchId);

        emit BatchRegistered(batchId, product, msg.sender, hash);
    }

    function addSupplyChainEvent(
        string calldata batchId,
        Stage stage,
        string calldata actor,
        string calldata location,
        string calldata detailsJson
    ) external returns (bytes32 hash) {
        Batch storage batch = batches[batchId];
        if (!batch.exists) revert BatchNotFound();
        if (stage == Stage.ORIGIN || stage == Stage.STATUS_CHANGE) revert BadStage();
        if (!_canSubmitStage(msg.sender, stage)) revert Unauthorized();
        if (bytes(actor).length == 0 || bytes(location).length == 0) revert InvalidInput();

        TraceEvent[] storage events_ = batchEvents[batchId];
        TraceEvent storage previous = events_[events_.length - 1];
        uint256 index = events_.length;
        uint256 ts = block.timestamp;

        TraceEvent memory ev = TraceEvent({
            eventId: string.concat(batchId, "-", _uintToString(index)),
            batchId: batchId,
            index: index,
            stage: stage,
            actor: actor,
            actorOrg: _roleName(primaryRole(msg.sender)),
            location: location,
            timestamp: ts,
            detailsJson: detailsJson,
            previousHash: previous.hash,
            hash: bytes32(0),
            txHash: bytes32(0)
        });
        hash = _hashEvent(ev);
        ev.hash = hash;
        ev.txHash = blockhash(block.number - 1);

        events_.push(ev);
        batch.eventCount = events_.length;
        batch.updatedAt = ts;
        batch.latestHash = hash;

        emit EventAppended(batchId, stage, index, hash);
    }

    function flagContamination(
        string calldata batchId,
        string calldata reason,
        string calldata severity
    ) external returns (string memory recallId, bytes32 hash) {
        if (!_hasRole(msg.sender, Role.STORE_ADMIN)) revert Unauthorized();
        Batch storage batch = batches[batchId];
        if (!batch.exists) revert BatchNotFound();
        if (bytes(reason).length == 0) revert InvalidInput();
        if (batch.status == Status.CONTAMINATED || batch.status == Status.RECALLED) {
            revert AlreadyContaminated();
        }

        TraceEvent[] storage events_ = batchEvents[batchId];
        TraceEvent storage previous = events_[events_.length - 1];
        uint256 index = events_.length;
        uint256 ts = block.timestamp;

        string memory details = string.concat(
            '{"previousStatus":"SAFE","newStatus":"CONTAMINATED","reason":"',
            reason,
            '","severity":"',
            severity,
            '"}'
        );

        TraceEvent memory ev = TraceEvent({
            eventId: string.concat(batchId, "-", _uintToString(index)),
            batchId: batchId,
            index: index,
            stage: Stage.STATUS_CHANGE,
            actor: "Retail Quality Assurance",
            actorOrg: "RetailOrg",
            location: previous.location,
            timestamp: ts,
            detailsJson: details,
            previousHash: previous.hash,
            hash: bytes32(0),
            txHash: bytes32(0)
        });
        hash = _hashEvent(ev);
        ev.hash = hash;
        ev.txHash = blockhash(block.number - 1);
        events_.push(ev);

        batch.status = Status.CONTAMINATED;
        batch.contaminationReason = reason;
        batch.contaminationTimestamp = ts;
        batch.eventCount = events_.length;
        batch.updatedAt = ts;
        batch.latestHash = hash;

        recallId = string.concat("REC-", batchId);
        uint256 touchpoints = _countStoreTouchpoints(events_);
        recalls[recallId] = Recall({
            recallId: recallId,
            batchId: batchId,
            reason: reason,
            severity: severity,
            status: Status.CONTAMINATED,
            generatedAt: ts,
            touchpointCount: touchpoints,
            exists: true
        });
        recallIds.push(recallId);

        emit ContaminationFlagged(batchId, reason, recallId);
    }

    function getBatch(string calldata batchId) external view returns (Batch memory) {
        if (!batches[batchId].exists) revert BatchNotFound();
        return batches[batchId];
    }

    function getBatchHistory(string calldata batchId) external view returns (TraceEvent[] memory) {
        if (!batches[batchId].exists) revert BatchNotFound();
        return batchEvents[batchId];
    }

    function getAllBatchIds() external view returns (string[] memory) {
        return batchIds;
    }

    function getRecall(string calldata recallId) external view returns (Recall memory) {
        if (!recalls[recallId].exists) revert BatchNotFound();
        return recalls[recallId];
    }

    function getAllRecallIds() external view returns (string[] memory) {
        return recallIds;
    }

    function verifyIntegrity(string calldata batchId)
        external
        view
        returns (bool valid, uint256 checked, uint256 failures)
    {
        if (!batches[batchId].exists) revert BatchNotFound();
        TraceEvent[] storage events_ = batchEvents[batchId];
        checked = events_.length;
        bytes32 expectedPrev = GENESIS_PREV_HASH;
        for (uint256 i = 0; i < events_.length; i++) {
            TraceEvent storage ev = events_[i];
            if (ev.previousHash != expectedPrev) {
                failures++;
            }
            bytes32 recomputed = _hashEvent(ev);
            if (recomputed != ev.hash) {
                failures++;
            }
            expectedPrev = ev.hash;
        }
        valid = failures == 0;
    }

    function _canSubmitStage(address account, Stage stage) private view returns (bool) {
        if (_hasRole(account, Role.PROCESSOR) && stage == Stage.PROCESSOR) return true;
        if (_hasRole(account, Role.DISTRIBUTOR) && stage == Stage.DISTRIBUTOR) return true;
        if (
            _hasRole(account, Role.STORE_ADMIN)
                && (stage == Stage.WALMART_STORE || stage == Stage.CUSTOMER_SALE)
        ) {
            return true;
        }
        return false;
    }

    function _countStoreTouchpoints(TraceEvent[] storage events_) private view returns (uint256 count) {
        for (uint256 i = 0; i < events_.length; i++) {
            if (events_[i].stage == Stage.WALMART_STORE || events_[i].stage == Stage.CUSTOMER_SALE) {
                count++;
            }
        }
    }

    function _hashEvent(TraceEvent memory ev) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ev.index,
                ev.batchId,
                uint8(ev.stage),
                ev.actor,
                ev.actorOrg,
                ev.location,
                ev.timestamp,
                ev.detailsJson,
                ev.previousHash
            )
        );
    }

    function _roleName(Role role) private pure returns (string memory) {
        if (role == Role.FARM) return "FarmOrg";
        if (role == Role.PROCESSOR) return "ProcessorOrg";
        if (role == Role.DISTRIBUTOR) return "DistributorOrg";
        if (role == Role.STORE_ADMIN) return "RetailOrg";
        if (role == Role.AUDITOR) return "AuditorOrg";
        return "Unknown";
    }

    function _uintToString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
