"use strict";
// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Logger Utility
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var winston_1 = require("winston");
var logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'cecbs-api' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
});
// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
exports.default = exports.logger;
