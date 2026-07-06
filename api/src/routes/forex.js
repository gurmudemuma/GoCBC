"use strict";
// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Forex Allocation API Routes — uses shared FabricService singleton
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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var fabricService_1 = require("../services/fabricService");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../utils/logger");
var router = express_1.default.Router();
var fabricService = fabricService_1.FabricService.getInstance();
// ==================== FOREX ALLOCATION ROUTES ====================
// GET /api/v1/forex — all forex allocations
router.get('/', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, fabricService.queryAllForex()];
            case 1:
                result = _a.sent();
                if (result.success) {
                    res.json({ success: true, data: result.data || [], timestamp: new Date().toISOString() });
                }
                else {
                    res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: result.error }, timestamp: new Date().toISOString() });
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error('Error fetching forex allocations:', error_1);
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error_1.message }, timestamp: new Date().toISOString() });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/v1/forex/:forexId — single forex record
router.get('/:forexId', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, fabricService.getForex(req.params.forexId)];
            case 1:
                result = _a.sent();
                if (result.success) {
                    res.json({ success: true, data: result.data, timestamp: new Date().toISOString() });
                }
                else {
                    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.error }, timestamp: new Date().toISOString() });
                }
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error_2.message }, timestamp: new Date().toISOString() });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/v1/forex/exporter/:exporterId
router.get('/exporter/:exporterId', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, fabricService.getForexByExporter(req.params.exporterId)];
            case 1:
                result = _a.sent();
                if (result.success) {
                    res.json({ success: true, data: result.data || [], timestamp: new Date().toISOString() });
                }
                else {
                    res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: result.error }, timestamp: new Date().toISOString() });
                }
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error_3.message }, timestamp: new Date().toISOString() });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/v1/forex/request — create forex request
router.post('/request', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, forexId, contractId, exporterId, lcId, amount, currency, finalCurrency, result, lastError, maxRetries, _loop_1, attempt, state_1, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, , 6]);
                _a = req.body, forexId = _a.forexId, contractId = _a.contractId, exporterId = _a.exporterId, lcId = _a.lcId, amount = _a.amount, currency = _a.currency;
                if (!forexId || !contractId || !exporterId || !amount || !lcId) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'forexId, contractId, exporterId, amount, lcId are required' } })];
                }
                finalCurrency = currency || 'USD';
                result = void 0;
                lastError = void 0;
                maxRetries = 5;
                _loop_1 = function (attempt) {
                    var waitTime_1, error_5, waitTime_2;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 8, , 11]);
                                return [4 /*yield*/, fabricService.invokeChaincode('RequestForex', [
                                        forexId, contractId, exporterId, lcId, amount.toString(), finalCurrency,
                                    ])];
                            case 1:
                                result = _c.sent();
                                if (!result.success) return [3 /*break*/, 3];
                                logger_1.logger.info("\u2705 Forex request created: ".concat(forexId, " (attempt ").concat(attempt, ")"));
                                // Wait for transaction to propagate to all peers before responding
                                // This prevents the next operation (AllocateForex) from failing
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                            case 2:
                                // Wait for transaction to propagate to all peers before responding
                                // This prevents the next operation (AllocateForex) from failing
                                _c.sent();
                                return [2 /*return*/, { value: res.status(201).json({
                                            success: true,
                                            data: { forexId: forexId },
                                            txId: result.txId,
                                            attempt: attempt,
                                            timestamp: new Date().toISOString()
                                        }) }];
                            case 3:
                                lastError = result.error;
                                if (!(result.error && (result.error.includes('Peer endorsements do not match') ||
                                    result.error.includes('does not exist') ||
                                    result.error.includes('not found')))) return [3 /*break*/, 6];
                                waitTime_1 = 4000 * attempt;
                                logger_1.logger.warn("Peer sync issue detected on attempt ".concat(attempt, "/").concat(maxRetries, ", waiting ").concat(waitTime_1, "ms before retry..."));
                                if (!(attempt < maxRetries)) return [3 /*break*/, 5];
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_1); })];
                            case 4:
                                _c.sent();
                                return [2 /*return*/, "continue"];
                            case 5: return [3 /*break*/, 7];
                            case 6: return [2 /*return*/, "break"];
                            case 7: return [3 /*break*/, 11];
                            case 8:
                                error_5 = _c.sent();
                                lastError = error_5.message;
                                logger_1.logger.error("Error on attempt ".concat(attempt, ":"), error_5);
                                if (!(attempt < maxRetries)) return [3 /*break*/, 10];
                                waitTime_2 = 4000 * attempt;
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_2); })];
                            case 9:
                                _c.sent();
                                _c.label = 10;
                            case 10: return [3 /*break*/, 11];
                            case 11: return [2 /*return*/];
                        }
                    });
                };
                attempt = 1;
                _b.label = 1;
            case 1:
                if (!(attempt <= maxRetries)) return [3 /*break*/, 4];
                return [5 /*yield**/, _loop_1(attempt)];
            case 2:
                state_1 = _b.sent();
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
                if (state_1 === "break")
                    return [3 /*break*/, 4];
                _b.label = 3;
            case 3:
                attempt++;
                return [3 /*break*/, 1];
            case 4:
                // All retries failed
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'REQUEST_FAILED',
                        message: lastError,
                        hint: 'Peers may not be synchronized. Wait a few seconds and try again, or check that the LC exists and blockchain peers are healthy.'
                    },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 6];
            case 5:
                error_4 = _b.sent();
                logger_1.logger.error('Error requesting forex:', error_4);
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error_4.message }, timestamp: new Date().toISOString() });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /api/v1/forex/allocate — NBE allocates forex (NBEMSP enforced on-chain)
router.post('/allocate', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, forexId, amount, exchangeRate, retentionRate, nbeOfficer, nbeApprovalRef, expiryDate, result, lastError, maxRetries, _loop_2, attempt, state_2, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 6, , 7]);
                _a = req.body, forexId = _a.forexId, amount = _a.amount, exchangeRate = _a.exchangeRate, retentionRate = _a.retentionRate, nbeOfficer = _a.nbeOfficer, nbeApprovalRef = _a.nbeApprovalRef, expiryDate = _a.expiryDate;
                if (!forexId || !amount || !exchangeRate || !retentionRate || !nbeOfficer || !nbeApprovalRef || !expiryDate) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'All fields required: forexId, amount, exchangeRate, retentionRate, nbeOfficer, nbeApprovalRef, expiryDate' } })];
                }
                // Connect as NBE since AllocateForex requires NBEMSP
                return [4 /*yield*/, fabricService.connectAsOrg('NBEMSP')];
            case 1:
                // Connect as NBE since AllocateForex requires NBEMSP
                _b.sent();
                result = void 0;
                lastError = void 0;
                maxRetries = 5;
                _loop_2 = function (attempt) {
                    var waitTime_3, error_7, waitTime_4;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 8, , 11]);
                                return [4 /*yield*/, fabricService.invokeChaincode('AllocateForex', [
                                        forexId,
                                        amount.toString(),
                                        exchangeRate.toString(),
                                        retentionRate.toString(),
                                        nbeOfficer,
                                        nbeApprovalRef,
                                        expiryDate,
                                    ])];
                            case 1:
                                result = _c.sent();
                                if (!result.success) return [3 /*break*/, 3];
                                logger_1.logger.info("Forex allocated: ".concat(forexId, " by ").concat(nbeOfficer, " (attempt ").concat(attempt, ")"));
                                // Wait for transaction to propagate before responding
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                            case 2:
                                // Wait for transaction to propagate before responding
                                _c.sent();
                                return [2 /*return*/, { value: res.json({
                                            success: true,
                                            data: { forexId: forexId },
                                            txId: result.txId,
                                            attempt: attempt,
                                            timestamp: new Date().toISOString()
                                        }) }];
                            case 3:
                                lastError = result.error;
                                if (!(result.error && (result.error.includes('does not exist') ||
                                    result.error.includes('Peer endorsements do not match') ||
                                    result.error.includes('not found')))) return [3 /*break*/, 6];
                                waitTime_3 = 5000 * attempt;
                                logger_1.logger.warn("Forex not synced or peer mismatch on attempt ".concat(attempt, "/").concat(maxRetries, ", waiting ").concat(waitTime_3, "ms..."));
                                if (!(attempt < maxRetries)) return [3 /*break*/, 5];
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_3); })];
                            case 4:
                                _c.sent();
                                return [2 /*return*/, "continue"];
                            case 5: return [3 /*break*/, 7];
                            case 6: return [2 /*return*/, "break"];
                            case 7: return [3 /*break*/, 11];
                            case 8:
                                error_7 = _c.sent();
                                lastError = error_7.message;
                                logger_1.logger.error("Error on attempt ".concat(attempt, ":"), error_7);
                                if (!(attempt < maxRetries)) return [3 /*break*/, 10];
                                waitTime_4 = 5000 * attempt;
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_4); })];
                            case 9:
                                _c.sent();
                                _c.label = 10;
                            case 10: return [3 /*break*/, 11];
                            case 11: return [2 /*return*/];
                        }
                    });
                };
                attempt = 1;
                _b.label = 2;
            case 2:
                if (!(attempt <= maxRetries)) return [3 /*break*/, 5];
                return [5 /*yield**/, _loop_2(attempt)];
            case 3:
                state_2 = _b.sent();
                if (typeof state_2 === "object")
                    return [2 /*return*/, state_2.value];
                if (state_2 === "break")
                    return [3 /*break*/, 5];
                _b.label = 4;
            case 4:
                attempt++;
                return [3 /*break*/, 2];
            case 5:
                // All retries failed
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'ALLOCATE_FAILED',
                        message: lastError,
                        hint: 'Forex request may not be synchronized across peers yet. Wait a few seconds and try again.'
                    },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 7];
            case 6:
                error_6 = _b.sent();
                logger_1.logger.error('Error allocating forex:', error_6);
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error_6.message }, timestamp: new Date().toISOString() });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// POST /api/v1/forex/utilize
router.post('/utilize', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, forexId, utilizedAmount, result, error_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, forexId = _a.forexId, utilizedAmount = _a.utilizedAmount;
                return [4 /*yield*/, fabricService.invokeChaincode('UtilizeForex', [forexId, utilizedAmount.toString()])];
            case 1:
                result = _b.sent();
                if (result.success) {
                    res.json({ success: true, txId: result.txId, timestamp: new Date().toISOString() });
                }
                else {
                    res.status(400).json({ success: false, error: { code: 'UTILIZE_FAILED', message: result.error }, timestamp: new Date().toISOString() });
                }
                return [3 /*break*/, 3];
            case 2:
                error_8 = _b.sent();
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error_8.message }, timestamp: new Date().toISOString() });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
