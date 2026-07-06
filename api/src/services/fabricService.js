"use strict";
// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Hyperledger Fabric Service
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FabricService = void 0;
var fabric_network_1 = require("fabric-network");
var fs = require("fs");
var path = require("path");
var sqlite3 = require("sqlite3");
var logger_1 = require("../utils/logger");
var FabricService = /** @class */ (function () {
    function FabricService() {
        this.gateway = null;
        this.network = null;
        this.contract = null;
        this.wallet = null;
        this.connected = false;
        this.db = null;
        this.connectCalled = false;
        // Gateway is created lazily in connect() to ensure env vars are loaded first
        this.initializeDatabase();
    }
    FabricService.getInstance = function () {
        if (!FabricService.instance) {
            FabricService.instance = new FabricService();
        }
        return FabricService.instance;
    };
    FabricService.prototype.initializeDatabase = function () {
        var _this = this;
        try {
            var dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'cecbs.db');
            this.db = new sqlite3.Database(dbPath, function (err) {
                if (err) {
                    logger_1.logger.error('Failed to connect to SQLite database:', err);
                }
                else {
                    logger_1.logger.info('✅ Connected to SQLite database');
                    _this.createTables();
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize database:', error);
        }
    };
    FabricService.prototype.createTables = function () {
        var _this = this;
        if (!this.db)
            return;
        var createTableSQL = "\n      CREATE TABLE IF NOT EXISTS exporter_applications (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        application_id TEXT UNIQUE NOT NULL,\n        company_name TEXT NOT NULL,\n        tin_number TEXT NOT NULL,\n        business_license_number TEXT NOT NULL,\n        registration_date TEXT,\n        exporter_type TEXT DEFAULT 'private',\n        capital_requirement TEXT NOT NULL,\n        professional_taster TEXT NOT NULL,\n        taster_certificate TEXT NOT NULL,\n        laboratory_facility TEXT DEFAULT '',\n        laboratory_certificate_number TEXT,\n        contact_person TEXT NOT NULL,\n        email TEXT NOT NULL,\n        phone TEXT NOT NULL,\n        address TEXT NOT NULL,\n        city TEXT NOT NULL,\n        region TEXT,\n        bank_name TEXT,\n        bank_account_number TEXT,\n        bank_branch_name TEXT,\n        bank_branch_code TEXT,\n        comments TEXT,\n        status TEXT DEFAULT 'pending',\n        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,\n        approved_at TEXT,\n        rejected_at TEXT,\n        rejection_reason TEXT,\n        exporter_id TEXT,\n        ecta_license_number TEXT,\n        license_expiry_date TEXT,\n        reviewed_by TEXT\n      );\n    ";
        this.db.run(createTableSQL, function (err) {
            var _a, _b, _c;
            if (err) {
                logger_1.logger.error('Failed to create exporter_applications table:', err);
            }
            else {
                logger_1.logger.info('✅ Exporter applications table ready');
                // Create indexes
                (_a = _this.db) === null || _a === void 0 ? void 0 : _a.run('CREATE INDEX IF NOT EXISTS idx_exporter_applications_status ON exporter_applications(status)');
                (_b = _this.db) === null || _b === void 0 ? void 0 : _b.run('CREATE INDEX IF NOT EXISTS idx_exporter_applications_email ON exporter_applications(email)');
                (_c = _this.db) === null || _c === void 0 ? void 0 : _c.run('CREATE INDEX IF NOT EXISTS idx_exporter_applications_submitted ON exporter_applications(submitted_at)');
            }
        });
    };
    // Normalize organization name to MSP ID
    FabricService.prototype.normalizeMspId = function (org) {
        // First normalize: remove all non-alphanumeric chars and uppercase
        var normalized = org.toUpperCase().replace(/[^A-Z0-9]/g, '');
        // Then check against known patterns
        switch (normalized) {
            case 'NBE':
            case 'NBEMSP':
            case 'NATIONALBANKOFETHIOPIA':
                return 'NBEMSP';
            case 'ECTA':
            case 'ECTAMSP':
            case 'ETHIOPIANCOFFEEANDTEAAUTHORITY': // with "AND"
            case 'ETHIOPIANCOFFEETEAAUTHORITY': // without "AND" (& symbol removed)
                return 'ECTAMSP';
            case 'ECX':
            case 'ECXMSP':
            case 'ETHIOPIANCOMMODITYEXCHANGE':
                return 'ECXMSP';
            case 'BANKS':
            case 'BANKSMSP':
            case 'COMMERCIALBANKOFETHIOPIA':
                return 'BanksMSP';
            case 'CUSTOMS':
            case 'CUSTOMSMSP':
            case 'ETHIOPIANCUSTOMS':
                return 'CustomsMSP';
            case 'SHIPPING':
            case 'SHIPPINGMSP':
            case 'SHIPPINGLINES':
                return 'ShippingMSP';
            default:
                // If the normalized version ends with MSP, it's already in MSP format
                if (normalized.endsWith('MSP')) {
                    return normalized;
                }
                // Otherwise add MSP suffix to normalized version
                return "".concat(normalized, "MSP");
        }
    };
    FabricService.prototype.connect = function (orgId) {
        return __awaiter(this, void 0, void 0, function () {
            var requireFabric, targetOrg, forcedReconnect, adminLabel, _a, adminIdentity, ccp, connectionOptions, _b, error_1, message;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        requireFabric = process.env.FABRIC_REQUIRED === 'true';
                        targetOrg = orgId || process.env.FABRIC_MSP_ID || 'ECTAMSP';
                        // Normalize the organization ID to proper MSP format
                        targetOrg = this.normalizeMspId(targetOrg);
                        forcedReconnect = orgId && process.env.FABRIC_MSP_ID !== targetOrg;
                        // Already connected to the same org and not forcing reconnect — no-op
                        if (this.connected && process.env.FABRIC_MSP_ID === targetOrg && !forcedReconnect) {
                            return [2 /*return*/];
                        }
                        if (process.env.FABRIC_ENABLED === 'false') {
                            if (!this.connectCalled) {
                                logger_1.logger.warn('Fabric integration disabled by configuration; continuing without blockchain connectivity');
                                this.connectCalled = true;
                            }
                            this.connected = false;
                            return [2 /*return*/];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 8, , 9]);
                        logger_1.logger.info("Connecting to Hyperledger Fabric network as ".concat(targetOrg, "..."));
                        process.env.FABRIC_MSP_ID = targetOrg;
                        adminLabel = "admin-".concat(targetOrg);
                        // Load wallet
                        _a = this;
                        return [4 /*yield*/, fabric_network_1.Wallets.newFileSystemWallet(process.env.FABRIC_WALLET_PATH || './wallet')];
                    case 2:
                        // Load wallet
                        _a.wallet = _c.sent();
                        return [4 /*yield*/, this.wallet.get(adminLabel)];
                    case 3:
                        adminIdentity = _c.sent();
                        if (!!adminIdentity) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.importAdminIdentity(targetOrg, adminLabel)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        ccp = this.buildConnectionProfile();
                        connectionOptions = {
                            wallet: this.wallet,
                            identity: adminLabel,
                            discovery: {
                                enabled: true,
                                asLocalhost: process.env.FABRIC_AS_LOCALHOST !== 'false',
                            },
                        };
                        if (!this.gateway) {
                            this.gateway = new fabric_network_1.Gateway();
                        }
                        else {
                            this.gateway.disconnect();
                            this.gateway = new fabric_network_1.Gateway();
                        }
                        return [4 /*yield*/, this.gateway.connect(ccp, connectionOptions)];
                    case 6:
                        _c.sent();
                        _b = this;
                        return [4 /*yield*/, this.gateway.getNetwork(process.env.FABRIC_CHANNEL_NAME || 'coffeechannel')];
                    case 7:
                        _b.network = _c.sent();
                        this.contract = this.network.getContract(process.env.FABRIC_CHAINCODE_NAME || 'coffee');
                        this.connected = true;
                        logger_1.logger.info("\u2705 Successfully connected to Hyperledger Fabric network as ".concat(targetOrg));
                        return [3 /*break*/, 9];
                    case 8:
                        error_1 = _c.sent();
                        message = error_1 instanceof Error ? error_1.message : String(error_1);
                        logger_1.logger.warn("Fabric network unavailable; continuing without blockchain connectivity. ".concat(message));
                        // Disconnect gateway to stop any background discovery/event threads
                        try {
                            if (this.gateway) {
                                this.gateway.disconnect();
                                this.gateway = null;
                            }
                        }
                        catch (_) { /* ignore disconnect errors */ }
                        this.connected = false;
                        this.network = null;
                        this.contract = null;
                        if (requireFabric) {
                            throw error_1;
                        }
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    FabricService.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.gateway) {
                    this.gateway.disconnect();
                    this.connected = false;
                    logger_1.logger.info('Disconnected from Hyperledger Fabric network');
                }
                if (this.db) {
                    this.db.close(function (err) {
                        if (err) {
                            logger_1.logger.error('Error closing database:', err);
                        }
                        else {
                            logger_1.logger.info('Database connection closed');
                        }
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    FabricService.prototype.isConnected = function () {
        return this.connected;
    };
    FabricService.prototype.connectAsOrg = function (orgId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connect(orgId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FabricService.prototype.importAdminIdentity = function (orgId_1) {
        return __awaiter(this, arguments, void 0, function (orgId, label) {
            var mspId, orgName, credPath, certPath, certFiles, certificate, keyPath, keyFiles, privateKey, x509Identity, error_2;
            if (label === void 0) { label = 'admin'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger_1.logger.info('Importing admin identity from cryptogen certificates...');
                        mspId = orgId || process.env.FABRIC_MSP_ID || 'ECTAMSP';
                        // Normalize using the class method
                        mspId = this.normalizeMspId(mspId);
                        logger_1.logger.info("[FABRIC] Normalized MSP ID from \"".concat(orgId, "\" to \"").concat(mspId, "\""));
                        orgName = mspId.replace('MSP', '').toLowerCase();
                        logger_1.logger.info("[FABRIC] Using organization name: \"".concat(orgName, "\" for credential path"));
                        credPath = path.join(__dirname, '..', '..', '..', 'blockchain', 'organizations', 'peerOrganizations', "".concat(orgName, ".cecbs.et"), 'users', "Admin@".concat(orgName, ".cecbs.et"), 'msp');
                        certPath = path.join(credPath, 'signcerts');
                        certFiles = fs.readdirSync(certPath);
                        if (certFiles.length === 0) {
                            throw new Error("No certificate found in ".concat(certPath));
                        }
                        certificate = fs.readFileSync(path.join(certPath, certFiles[0]), 'utf8');
                        keyPath = path.join(credPath, 'keystore');
                        keyFiles = fs.readdirSync(keyPath);
                        if (keyFiles.length === 0) {
                            throw new Error("No private key found in ".concat(keyPath));
                        }
                        privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');
                        x509Identity = {
                            credentials: {
                                certificate: certificate,
                                privateKey: privateKey,
                            },
                            mspId: mspId,
                            type: 'X.509',
                        };
                        return [4 /*yield*/, this.wallet.put(label, x509Identity)];
                    case 1:
                        _a.sent();
                        logger_1.logger.info("\u2705 Admin identity imported successfully for ".concat(mspId));
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error('Failed to import admin identity:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FabricService.prototype.buildConnectionProfile = function () {
        var _a, _b, _c, _d;
        var mspId = process.env.FABRIC_MSP_ID || 'ECTAMSP';
        var orgName = mspId.replace('MSP', '').toLowerCase();
        var channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
        // Build connection profile dynamically
        return {
            name: 'cecbs-network',
            version: '1.0.0',
            client: {
                organization: orgName,
                connection: {
                    timeout: {
                        peer: {
                            endorser: '300',
                        },
                        orderer: '300',
                    },
                },
            },
            channels: (_a = {},
                _a[channelName] = {
                    orderers: ['orderer.cecbs.et'],
                    peers: (_b = {},
                        _b["peer0.".concat(orgName, ".cecbs.et")] = {
                            endorsingPeer: true,
                            chaincodeQuery: true,
                            ledgerQuery: true,
                            eventSource: true,
                        },
                        _b),
                },
                _a),
            organizations: (_c = {},
                _c[orgName] = {
                    mspid: mspId,
                    peers: ["peer0.".concat(orgName, ".cecbs.et")],
                    certificateAuthorities: [],
                },
                _c),
            peers: (_d = {},
                _d["peer0.".concat(orgName, ".cecbs.et")] = {
                    url: "grpcs://localhost:".concat(this.getPeerPort(orgName)),
                    tlsCACerts: {
                        path: path.join(__dirname, '..', '..', '..', 'blockchain', 'organizations', 'peerOrganizations', "".concat(orgName, ".cecbs.et"), 'peers', "peer0.".concat(orgName, ".cecbs.et"), 'tls', 'ca.crt'),
                    },
                    grpcOptions: {
                        'ssl-target-name-override': "peer0.".concat(orgName, ".cecbs.et"),
                        hostnameOverride: "peer0.".concat(orgName, ".cecbs.et"),
                        'grpc.keepalive_time_ms': 120000,
                        'grpc.keepalive_timeout_ms': 20000,
                        'grpc.keepalive_permit_without_calls': 1,
                        'grpc.http2.min_time_between_pings_ms': 120000,
                        'grpc.http2.max_pings_without_data': 0,
                    },
                },
                _d),
            orderers: {
                'orderer.cecbs.et': {
                    url: 'grpcs://localhost:7050',
                    tlsCACerts: {
                        path: path.join(__dirname, '..', '..', '..', 'blockchain', 'organizations', 'ordererOrganizations', 'cecbs.et', 'orderers', 'orderer.cecbs.et', 'tls', 'ca.crt'),
                    },
                    grpcOptions: {
                        'ssl-target-name-override': 'orderer.cecbs.et',
                        hostnameOverride: 'orderer.cecbs.et',
                        'grpc.keepalive_time_ms': 120000,
                        'grpc.keepalive_timeout_ms': 20000,
                    },
                },
            },
        };
    };
    FabricService.prototype.getPeerPort = function (orgName) {
        var portMap = {
            ecta: 7051,
            ecx: 8051,
            banks: 9051,
            nbe: 10051,
            customs: 11051,
            shipping: 12051,
        };
        return portMap[orgName] || 7051;
    };
    // Chaincode invoke operations
    FabricService.prototype.invokeChaincode = function (functionName, args) {
        return __awaiter(this, void 0, void 0, function () {
            var maxRetries, lastError, _loop_1, this_1, attempt, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        maxRetries = 4;
                        _loop_1 = function (attempt) {
                            var transaction, result, txId, error_3, errorMessage, isPeerSyncIssue, waitTime_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 4, , 7]);
                                        if (!(!this_1.contract || !this_1.network)) return [3 /*break*/, 2];
                                        logger_1.logger.warn('Contract or network is null, attempting to reconnect...');
                                        return [4 /*yield*/, this_1.connect()];
                                    case 1:
                                        _b.sent();
                                        _b.label = 2;
                                    case 2:
                                        if (!this_1.contract) {
                                            throw new Error('Not connected to Fabric network');
                                        }
                                        logger_1.logger.info("Invoking chaincode function: ".concat(functionName, " (attempt ").concat(attempt, "/").concat(maxRetries, ")"), { args: args });
                                        transaction = this_1.contract.createTransaction(functionName);
                                        return [4 /*yield*/, transaction.submit.apply(transaction, args)];
                                    case 3:
                                        result = _b.sent();
                                        txId = transaction.getTransactionId();
                                        logger_1.logger.info("\u2705 Chaincode invoke successful: ".concat(functionName, " (attempt ").concat(attempt, ")"), { txId: txId });
                                        return [2 /*return*/, { value: {
                                                    success: true,
                                                    data: result.toString() ? JSON.parse(result.toString()) : null,
                                                    txId: txId,
                                                } }];
                                    case 4:
                                        error_3 = _b.sent();
                                        lastError = error_3;
                                        errorMessage = error_3 instanceof Error ? error_3.message : 'Unknown error';
                                        logger_1.logger.error("Failed to invoke chaincode function ".concat(functionName, " (attempt ").concat(attempt, "/").concat(maxRetries, "):"), error_3);
                                        isPeerSyncIssue = errorMessage.includes('Peer endorsements do not match') ||
                                            errorMessage.includes('does not exist') ||
                                            errorMessage.includes('not found') ||
                                            errorMessage.includes('MVCC_READ_CONFLICT');
                                        if (!(isPeerSyncIssue && attempt < maxRetries)) return [3 /*break*/, 6];
                                        waitTime_1 = 4000 * attempt;
                                        logger_1.logger.warn("\uD83D\uDD04 Peer synchronization issue detected, waiting ".concat(waitTime_1, "ms before retry ").concat(attempt + 1, "/").concat(maxRetries, "..."));
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_1); })];
                                    case 5:
                                        _b.sent();
                                        return [2 /*return*/, "continue"];
                                    case 6:
                                        // If not a sync issue or last attempt, return failure
                                        if (attempt === maxRetries) {
                                            logger_1.logger.error("\u274C All ".concat(maxRetries, " attempts failed for ").concat(functionName));
                                        }
                                        return [3 /*break*/, 7];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        attempt = 1;
                        _a.label = 1;
                    case 1:
                        if (!(attempt <= maxRetries)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(attempt)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 4: 
                    // All retries failed
                    return [2 /*return*/, {
                            success: false,
                            error: lastError instanceof Error ? lastError.message : 'Unknown error',
                        }];
                }
            });
        });
    };
    // Chaincode query operations
    FabricService.prototype.queryChaincode = function (functionName, args) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        if (!(!this.contract || !this.network)) return [3 /*break*/, 2];
                        logger_1.logger.warn('Contract or network is null, attempting to reconnect...');
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        if (!this.contract) {
                            throw new Error('Not connected to Fabric network');
                        }
                        logger_1.logger.info("Querying chaincode function: ".concat(functionName), { args: args });
                        return [4 /*yield*/, (_a = this.contract).evaluateTransaction.apply(_a, __spreadArray([functionName], args, false))];
                    case 3:
                        result = _b.sent();
                        logger_1.logger.info("\u2705 Chaincode query successful: ".concat(functionName));
                        return [2 /*return*/, {
                                success: true,
                                data: result.toString() ? JSON.parse(result.toString()) : null,
                            }];
                    case 4:
                        error_4 = _b.sent();
                        logger_1.logger.error("Failed to query chaincode function ".concat(functionName, ":"), error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Exporter operations
    FabricService.prototype.registerExporter = function (exporterId, companyName, ectaLicenseNumber, exporterType, capitalRequirement, professionalTaster, tasterCertificate, laboratoryCertificateNumber, licenseExpiryDate) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RegisterExporter', [
                        exporterId,
                        companyName,
                        ectaLicenseNumber,
                        exporterType,
                        capitalRequirement,
                        professionalTaster,
                        tasterCertificate,
                        laboratoryCertificateNumber,
                        licenseExpiryDate,
                    ])];
            });
        });
    };
    FabricService.prototype.getExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getAllExporters = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllExporters', [])];
            });
        });
    };
    FabricService.prototype.updateExporterLaboratory = function (exporterId, certified) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('UpdateExporterLaboratory', [exporterId, certified.toString()])];
            });
        });
    };
    FabricService.prototype.updateExporterStatus = function (exporterId, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('UpdateExporterStatus', [exporterId, status])];
            });
        });
    };
    // Sales contract operations
    FabricService.prototype.registerSalesContract = function (contractId, exporterId, buyerId, buyerCountry, coffeeType, quantity, pricePerKg, currency, eudrRequired, buyerBank, exporterBank, documentsJSON) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RegisterSalesContract', [
                        contractId,
                        exporterId,
                        buyerId,
                        buyerCountry,
                        coffeeType,
                        quantity,
                        pricePerKg,
                        currency,
                        eudrRequired,
                        buyerBank || '',
                        exporterBank || '',
                        documentsJSON || '[]',
                    ])];
            });
        });
    };
    FabricService.prototype.getSalesContract = function (contractId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadSalesContract', [contractId])];
            });
        });
    };
    FabricService.prototype.getAllContracts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllContracts', [])];
            });
        });
    };
    FabricService.prototype.approveSalesContract = function (contractId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ApproveSalesContract', [contractId])];
            });
        });
    };
    // Letter of Credit operations
    FabricService.prototype.requestLC = function (lcId, contractId, exporterId, bankName, amount, currency, expiryDate) {
        return __awaiter(this, void 0, void 0, function () {
            var exporterCheck;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // First verify the exporter exists on blockchain
                        logger_1.logger.info("Verifying exporter ".concat(exporterId, " exists before LC request..."));
                        return [4 /*yield*/, this.getExporter(exporterId)];
                    case 1:
                        exporterCheck = _a.sent();
                        if (!exporterCheck.success) {
                            logger_1.logger.error("\u274C Exporter ".concat(exporterId, " does not exist on blockchain"));
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Exporter ".concat(exporterId, " is not registered on the blockchain. Please contact ECTA admin to register this exporter first."),
                                }];
                        }
                        logger_1.logger.info("\u2705 Exporter ".concat(exporterId, " verified on blockchain, proceeding with LC request..."));
                        return [2 /*return*/, this.invokeChaincode('RequestLC', [
                                lcId,
                                contractId,
                                exporterId,
                                bankName,
                                amount,
                                currency,
                                expiryDate,
                            ])];
                }
            });
        });
    };
    FabricService.prototype.approveLC = function (lcId, issuingBank, advisingBank, beneficiary) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ApproveLC', [
                        lcId,
                        issuingBank,
                        advisingBank,
                        beneficiary,
                    ])];
            });
        });
    };
    FabricService.prototype.issueLC = function (lcId, terms) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('IssueLC', [lcId, terms])];
            });
        });
    };
    FabricService.prototype.queryAllLCs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allStatuses, error_5, allLCs, _i, allStatuses_1, status_1, result, statusError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        allStatuses = ['REQUESTED', 'APPROVED', 'ISSUED', 'UTILIZED', 'EXPIRED'];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 10]);
                        return [4 /*yield*/, this.queryChaincode('QueryAllLCs', [])];
                    case 2: 
                    // First try the proper function
                    return [2 /*return*/, _a.sent()];
                    case 3:
                        error_5 = _a.sent();
                        // If function doesn't exist, query by all statuses and combine results
                        logger_1.logger.warn('QueryAllLCs not available, using workaround with status queries');
                        allLCs = [];
                        _i = 0, allStatuses_1 = allStatuses;
                        _a.label = 4;
                    case 4:
                        if (!(_i < allStatuses_1.length)) return [3 /*break*/, 9];
                        status_1 = allStatuses_1[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.queryChaincode('QueryLCsByStatus', [status_1])];
                    case 6:
                        result = _a.sent();
                        if (result.success && result.data && Array.isArray(result.data)) {
                            allLCs.push.apply(allLCs, result.data);
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        statusError_1 = _a.sent();
                        // Continue with other statuses
                        logger_1.logger.warn("Failed to query LCs with status ".concat(status_1));
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9: return [2 /*return*/, {
                            success: true,
                            data: allLCs,
                        }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    FabricService.prototype.getLC = function (lcId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadLC', [lcId])];
            });
        });
    };
    // Forex operations
    FabricService.prototype.queryAllForex = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllForex', [])];
            });
        });
    };
    FabricService.prototype.getForex = function (forexId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadForex', [forexId])];
            });
        });
    };
    // Shipment operations
    FabricService.prototype.createShipment = function (shipmentId, contractId, exporterId, buyerId, origin, quantity, grade, icoNumber, ecxLotNumber, channel, forexRate, valueUsd, eudrCompliant, documentsJSON) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('CreateShipment', [
                        shipmentId,
                        contractId,
                        exporterId,
                        buyerId,
                        origin,
                        quantity,
                        grade,
                        icoNumber,
                        ecxLotNumber,
                        channel,
                        forexRate,
                        valueUsd,
                        eudrCompliant,
                        documentsJSON || '[]',
                    ])];
            });
        });
    };
    FabricService.prototype.getShipment = function (shipmentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadShipment', [shipmentId])];
            });
        });
    };
    FabricService.prototype.getAllShipments = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllAssets', [])];
            });
        });
    };
    FabricService.prototype.updateShipmentStatus = function (shipmentId, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('UpdateShipmentStatus', [shipmentId, status])];
            });
        });
    };
    FabricService.prototype.getShipmentHistory = function (shipmentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('GetShipmentHistory', [shipmentId])];
            });
        });
    };
    // Advanced query operations
    FabricService.prototype.getShipmentsByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryShipmentsByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getEUDRCompliantShipments = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryEUDRCompliantShipments', [])];
            });
        });
    };
    FabricService.prototype.getCompleteTraceability = function (shipmentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('GetCompleteTraceability', [shipmentId])];
            });
        });
    };
    // Exporter-specific query operations for Exporter Portal
    FabricService.prototype.getContractsByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryContractsByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getForexByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryForexByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getLCsByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryLCsByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getPaymentsByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryPaymentsByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getForexByContract = function (contractId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadForexAllocation', [contractId])];
            });
        });
    };
    FabricService.prototype.getLCByContract = function (contractId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadLC', [contractId])];
            });
        });
    };
    FabricService.prototype.getPaymentsByContract = function (contractId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryPaymentsByContract', [contractId])];
            });
        });
    };
    FabricService.prototype.submitPaymentDocuments = function (paymentId, documents) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('SubmitPaymentDocuments', [
                        paymentId,
                        JSON.stringify(documents),
                    ])];
            });
        });
    };
    FabricService.prototype.verifyPaymentDocuments = function (paymentId, verifiedBy, comments) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('VerifyPaymentDocuments', [
                        paymentId,
                        verifiedBy,
                        comments,
                    ])];
            });
        });
    };
    // ==================== PAYMENT METHOD-SPECIFIC FUNCTIONS ====================
    // Added June 26, 2026 for payment method differentiation
    FabricService.prototype.initiatePayment = function (paymentId, contractId, exporterId, lcId, amount, currency, receivingBank, receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod // LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
    ) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('InitiatePayment', [
                        paymentId,
                        contractId,
                        exporterId,
                        lcId,
                        amount,
                        currency,
                        receivingBank,
                        receivingBankBIC,
                        beneficiaryName,
                        beneficiaryAccount,
                        paymentMethod,
                    ])];
            });
        });
    };
    FabricService.prototype.releaseDocumentsToBuyer = function (paymentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ReleaseDocumentsToBuyer', [paymentId])];
            });
        });
    };
    FabricService.prototype.receiveAdvancePayment = function (paymentId, advancePercentage, amountReceived) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ReceiveAdvancePayment', [
                        paymentId,
                        advancePercentage,
                        amountReceived,
                    ])];
            });
        });
    };
    FabricService.prototype.receiveBalancePayment = function (paymentId, amountReceived) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ReceiveBalancePayment', [
                        paymentId,
                        amountReceived,
                    ])];
            });
        });
    };
    FabricService.prototype.updatePaymentStatus = function (paymentId, newStatus) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('UpdatePaymentStatus', [paymentId, newStatus])];
            });
        });
    };
    FabricService.prototype.getPaymentsByMethod = function (paymentMethod) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryPaymentsByMethod', [paymentMethod])];
            });
        });
    };
    FabricService.prototype.settlePayment = function (paymentId, exchangeRate, retentionRate, payingBank, payingBankBIC, swiftReference, nbeApprovalRef) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('SettlePayment', [
                        paymentId,
                        exchangeRate,
                        retentionRate,
                        payingBank,
                        payingBankBIC,
                        swiftReference,
                        nbeApprovalRef,
                    ])];
            });
        });
    };
    FabricService.prototype.getShipmentsByContract = function (contractId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryShipmentsByContract', [contractId])];
            });
        });
    };
    // Event listening
    FabricService.prototype.startEventListener = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!this.network) {
                            throw new Error('Not connected to Fabric network');
                        }
                        return [4 /*yield*/, this.network.addBlockListener(function (event) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    logger_1.logger.info('New block received:', {
                                        blockNumber: event.blockNumber,
                                    });
                                    return [2 /*return*/];
                                });
                            }); }, { type: 'filtered' })];
                    case 1:
                        _a.sent();
                        logger_1.logger.info('✅ Block event listener started');
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        logger_1.logger.error('Failed to start event listener:', error_6);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Network information
    FabricService.prototype.getNetworkInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var channelName, mspId, orgName;
            return __generator(this, function (_a) {
                try {
                    if (!this.network) {
                        throw new Error('Not connected to Fabric network');
                    }
                    channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
                    mspId = process.env.FABRIC_MSP_ID || 'ECTAMSP';
                    orgName = mspId.replace('MSP', '').toLowerCase();
                    return [2 /*return*/, {
                            channelName: channelName,
                            connectedOrg: mspId,
                            peers: ["peer0.".concat(orgName, ".cecbs.et:").concat(this.getPeerPort(orgName))],
                            orderers: ['orderer.cecbs.et:7050'],
                        }];
                }
                catch (error) {
                    logger_1.logger.error('Failed to get network info:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    // Generic query methods for exporters route compatibility
    FabricService.prototype.queryContracts = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getContractsByExporter(params.exporterId)];
            });
        });
    };
    FabricService.prototype.queryForexAllocations = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getForexByExporter(params.exporterId)];
            });
        });
    };
    FabricService.prototype.queryLettersOfCredit = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getLCsByExporter(params.exporterId)];
            });
        });
    };
    FabricService.prototype.queryPayments = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getPaymentsByExporter(params.exporterId)];
            });
        });
    };
    FabricService.prototype.queryShipments = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getShipmentsByExporter(params.exporterId)];
            });
        });
    };
    // ==================== QUALITY INSPECTION OPERATIONS ====================
    FabricService.prototype.requestInspection = function (inspectionId, shipmentId, contractId, exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RequestInspection', [
                        inspectionId,
                        shipmentId,
                        contractId,
                        exporterId,
                    ])];
            });
        });
    };
    FabricService.prototype.performInspection = function (inspectionId, inspectorId, inspectorName, sampleSize, moistureContent, defectCount, beanSize, color, odor, fragrance, flavor, aftertaste, acidity, body, balance, uniformity, cleanCup, sweetness, overall, classification, pesticideTest, heavyMetalTest, mycotoxinTest, remarks) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('PerformInspection', [
                        inspectionId,
                        inspectorId,
                        inspectorName,
                        sampleSize,
                        moistureContent,
                        defectCount,
                        beanSize,
                        color,
                        odor,
                        fragrance,
                        flavor,
                        aftertaste,
                        acidity,
                        body,
                        balance,
                        uniformity,
                        cleanCup,
                        sweetness,
                        overall,
                        classification,
                        pesticideTest,
                        heavyMetalTest,
                        mycotoxinTest,
                        remarks,
                    ])];
            });
        });
    };
    FabricService.prototype.approveInspection = function (inspectionId, approvedBy, certificateNo) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ApproveInspection', [
                        inspectionId,
                        approvedBy,
                        certificateNo,
                    ])];
            });
        });
    };
    FabricService.prototype.issueExportPermit = function (inspectionId, exportPermitNo, issuedBy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('IssueExportPermit', [
                        inspectionId,
                        exportPermitNo,
                        issuedBy,
                    ])];
            });
        });
    };
    FabricService.prototype.rejectInspection = function (inspectionId, rejectedBy, rejectionReason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RejectInspection', [
                        inspectionId,
                        rejectedBy,
                        rejectionReason,
                    ])];
            });
        });
    };
    FabricService.prototype.getInspection = function (inspectionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadInspection', [inspectionId])];
            });
        });
    };
    FabricService.prototype.getAllInspections = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllInspections', [])];
            });
        });
    };
    FabricService.prototype.getInspectionsByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryInspectionsByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getInspectionsByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryInspectionsByStatus', [status])];
            });
        });
    };
    // ==================== PHYTOSANITARY CERTIFICATE OPERATIONS ====================
    FabricService.prototype.issuePhytosanitaryCertificate = function (certificateID, shipmentID, exporterID, inspectorName, botanicalName, treatmentApplied, placeOfOrigin, pointOfEntry, quantity, packagingType, numberOfPackages, distinguishMarks, meansOfConveyance, issuedBy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('IssuePhytosanitaryCertificate', [
                        certificateID,
                        shipmentID,
                        exporterID,
                        inspectorName,
                        botanicalName,
                        treatmentApplied,
                        placeOfOrigin,
                        pointOfEntry,
                        quantity,
                        packagingType,
                        numberOfPackages,
                        distinguishMarks,
                        meansOfConveyance,
                        issuedBy,
                    ])];
            });
        });
    };
    FabricService.prototype.getPhytosanitaryCertificate = function (certificateID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadPhytosanitaryCertificate', [certificateID])];
            });
        });
    };
    FabricService.prototype.getPhytosanitaryCertificatesByShipment = function (shipmentID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryPhytosanitaryCertificatesByShipment', [shipmentID])];
            });
        });
    };
    FabricService.prototype.getPhytosanitaryCertificatesByExporter = function (exporterID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryPhytosanitaryCertificatesByExporter', [exporterID])];
            });
        });
    };
    FabricService.prototype.getAllPhytosanitaryCertificates = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllPhytosanitaryCertificates', [])];
            });
        });
    };
    FabricService.prototype.revokePhytosanitaryCertificate = function (certificateID, revokedBy, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RevokePhytosanitaryCertificate', [
                        certificateID,
                        revokedBy,
                        reason,
                    ])];
            });
        });
    };
    // ==================== INSURANCE CERTIFICATE OPERATIONS ====================
    FabricService.prototype.issueInsuranceCertificate = function (insuranceID, shipmentID, contractID, policyNumber, insuranceCompany, insuredValue, currency, coverageType, vesselName, voyageNumber, containerNumber, portOfLoading, portOfDischarge, goodsDescription, quantity, incoterm, claimsPayable, issuedBy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('IssueInsuranceCertificate', [
                        insuranceID,
                        shipmentID,
                        contractID,
                        policyNumber,
                        insuranceCompany,
                        insuredValue,
                        currency,
                        coverageType,
                        vesselName,
                        voyageNumber,
                        containerNumber,
                        portOfLoading,
                        portOfDischarge,
                        goodsDescription,
                        quantity,
                        incoterm,
                        claimsPayable,
                        issuedBy,
                    ])];
            });
        });
    };
    FabricService.prototype.getInsuranceCertificate = function (insuranceID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadInsuranceCertificate', [insuranceID])];
            });
        });
    };
    FabricService.prototype.getInsuranceCertificatesByShipment = function (shipmentID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryInsuranceCertificatesByShipment', [shipmentID])];
            });
        });
    };
    FabricService.prototype.getInsuranceCertificatesByContract = function (contractID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryInsuranceCertificatesByContract', [contractID])];
            });
        });
    };
    FabricService.prototype.getAllInsuranceCertificates = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllInsuranceCertificates', [])];
            });
        });
    };
    FabricService.prototype.recordInsuranceClaim = function (insuranceID, claimReason, claimAmount) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RecordInsuranceClaim', [
                        insuranceID,
                        claimReason,
                        claimAmount,
                    ])];
            });
        });
    };
    // ==================== ECX LOT RELEASE AUTOMATION ====================
    FabricService.prototype.releaseECXLotForShipment = function (shipmentID, ecxLotNumber, releasedBy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ReleaseECXLotForShipment', [
                        shipmentID,
                        ecxLotNumber,
                        releasedBy,
                    ])];
            });
        });
    };
    FabricService.prototype.getECXLotsByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryECXLotsByStatus', [status])];
            });
        });
    };
    // ==================== CUSTOMS DECLARATION OPERATIONS ====================
    FabricService.prototype.submitCustomsDeclaration = function (declarationId, shipmentId, exporterId, declarationType, hsCode, quantity, value, currency, destination, portOfExit, eudrCompliant) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('SubmitCustomsDeclaration', [
                        declarationId,
                        shipmentId,
                        exporterId,
                        declarationType,
                        hsCode,
                        quantity,
                        value,
                        currency,
                        destination,
                        portOfExit,
                        eudrCompliant,
                    ])];
            });
        });
    };
    FabricService.prototype.reviewCustomsDeclaration = function (declarationId, reviewedBy, inspectionType, inspectorNotes) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ReviewCustomsDeclaration', [
                        declarationId,
                        reviewedBy,
                        inspectionType,
                        inspectorNotes,
                    ])];
            });
        });
    };
    FabricService.prototype.completeCustomsInspection = function (declarationId, inspectionResult, inspectorComments) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('CompleteCustomsInspection', [
                        declarationId,
                        inspectionResult,
                        inspectorComments,
                    ])];
            });
        });
    };
    FabricService.prototype.clearCustomsDeclaration = function (declarationId, clearedBy, clearanceNumber, dutiesAmount) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('ClearCustomsDeclaration', [
                        declarationId,
                        clearedBy,
                        clearanceNumber,
                        dutiesAmount,
                    ])];
            });
        });
    };
    FabricService.prototype.rejectCustomsDeclaration = function (declarationId, rejectedBy, rejectionReason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invokeChaincode('RejectCustomsDeclaration', [
                        declarationId,
                        rejectedBy,
                        rejectionReason,
                    ])];
            });
        });
    };
    FabricService.prototype.getCustomsDeclaration = function (declarationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('ReadCustomsDeclaration', [declarationId])];
            });
        });
    };
    FabricService.prototype.getAllCustomsDeclarations = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryAllCustomsDeclarations', [])];
            });
        });
    };
    FabricService.prototype.getCustomsDeclarationsByExporter = function (exporterId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryCustomsDeclarationsByExporter', [exporterId])];
            });
        });
    };
    FabricService.prototype.getCustomsDeclarationsByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryChaincode('QueryCustomsDeclarationsByStatus', [status])];
            });
        });
    };
    // ==================== PASS-THROUGH METHODS ====================
    // These provide a lower-level interface for routes that call chaincode directly
    FabricService.prototype.submitTransaction = function (functionName) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                if (!this.contract) {
                    throw new Error('Not connected to Fabric network');
                }
                return [2 /*return*/, (_a = this.contract).submitTransaction.apply(_a, __spreadArray([functionName], args, false))];
            });
        });
    };
    FabricService.prototype.evaluateTransaction = function (functionName) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                if (!this.contract) {
                    throw new Error('Not connected to Fabric network');
                }
                return [2 /*return*/, (_a = this.contract).evaluateTransaction.apply(_a, __spreadArray([functionName], args, false))];
            });
        });
    };
    FabricService.instance = null;
    return FabricService;
}());
exports.FabricService = FabricService;
exports.default = FabricService;
