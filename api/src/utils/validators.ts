// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shared Validators - Reusable validation rules

import { body, param } from 'express-validator';

/**
 * Common entity ID validators
 */
export const validators = {
  // Contract validators
  contractId: () => 
    body('contractID')
      .notEmpty()
      .withMessage('Contract ID is required')
      .matches(/^CONTRACT-\d+$/)
      .withMessage('Invalid contract ID format'),
  
  contractIdParam: () =>
    param('contractId')
      .notEmpty()
      .withMessage('Contract ID is required'),

  // Exporter validators
  exporterId: () =>
    body('exporterID')
      .notEmpty()
      .withMessage('Exporter ID is required')
      .matches(/^EXP[A-Z0-9]+$/)
      .withMessage('Invalid exporter ID format'),

  exporterIdParam: () =>
    param('exporterId')
      .notEmpty()
      .withMessage('Exporter ID is required'),

  // LC validators
  lcId: () =>
    body('lcID')
      .notEmpty()
      .withMessage('LC ID is required')
      .matches(/^LC-\d+$/)
      .withMessage('Invalid LC ID format'),

  lcIdParam: () =>
    param('lcID')
      .notEmpty()
      .withMessage('LC ID is required'),

  // Forex validators
  forexId: () =>
    body('forexId')
      .notEmpty()
      .withMessage('Forex ID is required')
      .matches(/^FOREX-\d+$/)
      .withMessage('Invalid forex ID format'),

  forexIdParam: () =>
    param('forexId')
      .notEmpty()
      .withMessage('Forex ID is required'),

  // Shipment validators
  shipmentId: () =>
    body('shipmentID')
      .notEmpty()
      .withMessage('Shipment ID is required')
      .matches(/^SHIP-\d+$/)
      .withMessage('Invalid shipment ID format'),

  shipmentIdParam: () =>
    param('shipmentId')
      .notEmpty()
      .withMessage('Shipment ID is required'),

  // Common field validators
  amount: () =>
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => parseFloat(value) > 0)
      .withMessage('Amount must be greater than 0'),

  currency: () =>
    body('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isIn(['USD', 'EUR', 'ETB'])
      .withMessage('Currency must be USD, EUR, or ETB'),

  pricePerKg: () =>
    body('pricePerKg')
      .isNumeric()
      .withMessage('Price per kg must be a number')
      .custom((value) => parseFloat(value) >= 5.0)
      .withMessage('Price per kg must be at least 5.0 USD'),

  quantity: () =>
    body('quantity')
      .isNumeric()
      .withMessage('Quantity must be a number')
      .custom((value) => parseFloat(value) > 0)
      .withMessage('Quantity must be greater than 0'),

  email: () =>
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),

  phone: () =>
    body('phone')
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage('Valid phone number required'),
};

/**
 * Validation rule sets for common operations
 */
export const validationRules = {
  createContract: [
    validators.contractId(),
    validators.exporterId(),
    body('buyerID').notEmpty().withMessage('Buyer ID is required'),
    body('buyerCountry').notEmpty().withMessage('Buyer country is required'),
    body('coffeeType').notEmpty().withMessage('Coffee type is required'),
    validators.quantity(),
    validators.pricePerKg(),
    validators.currency(),
    body('paymentMethod')
      .isIn(['LC', 'CAD', 'TT_ADVANCE', 'TT_POST', 'ADVANCE'])
      .withMessage('Invalid payment method'),
    body('eudrRequired').isBoolean().withMessage('EUDR required must be boolean'),
  ],

  requestLC: [
    validators.lcId(),
    validators.contractId(),
    validators.exporterId(),
    body('bankName').notEmpty().withMessage('Bank name is required'),
    validators.amount(),
    validators.currency(),
    body('expiryDate').isISO8601().withMessage('Valid expiry date required'),
  ],

  requestForex: [
    validators.forexId(),
    validators.contractId(),
    validators.exporterId(),
    validators.amount(),
    validators.currency(),
  ],

  createShipment: [
    validators.shipmentId(),
    validators.contractId(),
    validators.exporterId(),
    body('buyerID').notEmpty().withMessage('Buyer ID is required'),
    body('origin').notEmpty().withMessage('Origin is required'),
    validators.quantity(),
    body('grade').notEmpty().withMessage('Grade is required'),
  ],
};
