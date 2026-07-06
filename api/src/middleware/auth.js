"use strict";
// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication Middleware
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.authMiddleware = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var logger_1 = require("../utils/logger");
var authMiddleware = function (req, res, next) {
    try {
        var authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_ERROR',
                    message: 'Missing or invalid authorization header',
                },
                timestamp: new Date().toISOString(),
            });
        }
        var token = authHeader.substring(7);
        var jwtSecret = process.env.JWT_SECRET || 'cecbs-secret-key';
        var decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        var rawOrg = decoded.organization || decoded.org || '';
        var normalizeOrg = function (org) {
            var normalized = org.toUpperCase().replace(/[^A-Z0-9]/g, '');
            switch (normalized) {
                case 'NBE':
                case 'NBEMSP':
                case 'NATIONALBANKOFETHIOPIA':
                    return 'NBEMSP';
                case 'ECTA':
                case 'ECTAMSP':
                case 'ETHIOPIANCOFFEEANDTEAAUTHORITY':
                    return 'ECTAMSP';
                case 'ECX':
                case 'ECXMSP':
                    return 'ECXMSP';
                case 'BANKS':
                case 'BANKSMSP':
                case 'COMMERCIALBANKOFETHIOPIA':
                    return 'BanksMSP';
                case 'CUSTOMS':
                case 'CUSTOMSMSP':
                    return 'CustomsMSP';
                case 'SHIPPING':
                case 'SHIPPINGMSP':
                    return 'ShippingMSP';
                default:
                    return org;
            }
        };
        req.user = {
            sub: decoded.sub,
            org: normalizeOrg(rawOrg),
            role: decoded.role,
            permissions: decoded.permissions || [],
        };
        // Add additional fields that may be needed by routes
        req.user.exporterId = decoded.exporterId || decoded.username || decoded.sub;
        req.user.username = decoded.username;
        req.user.userId = decoded.userId || decoded.sub;
        logger_1.logger.info('User authenticated:', {
            userId: req.user.sub,
            exporterId: req.user.exporterId,
            organization: req.user.org,
            role: req.user.role,
        });
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_ERROR',
                message: 'Invalid or expired token',
            },
            timestamp: new Date().toISOString(),
        });
    }
};
exports.authMiddleware = authMiddleware;
var requirePermission = function (permission) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_ERROR',
                    message: 'User not authenticated',
                },
                timestamp: new Date().toISOString(),
            });
        }
        if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('admin:system')) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'AUTHORIZATION_ERROR',
                    message: "Insufficient permissions. Required: ".concat(permission),
                },
                timestamp: new Date().toISOString(),
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
exports.default = exports.authMiddleware;
