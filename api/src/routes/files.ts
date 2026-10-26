// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// File Management API Routes

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /application\/pdf|image\/jpeg|image\/jpg|image\/png|application\/msword|application\/vnd\.openxmlformats/.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category:
 *                 type: string
 *                 enum: [certificate, contract, inspection, other]
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file or missing data
 *       500:
 *         description: Internal server error
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { category = 'other' } = req.body;

    logger.info(`File uploaded successfully: ${req.file.filename}`);

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        category,
        uploadDate: new Date().toISOString(),
        url: `/api/v1/files/${req.file.filename}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload file',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/files/{filename}:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: File name
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       404:
 *         description: File not found
 */
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.resolve(uploadDir, filename);
  const uploadDirPrefix = `${uploadDir}${path.sep}`;

  // Only serve regular files directly inside the upload directory. This
  // prevents encoded path traversal and symlink-based reads outside it.
  if (!filename || path.basename(filename) !== filename || !filePath.startsWith(uploadDirPrefix)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILENAME', message: 'Invalid file name' },
      timestamp: new Date().toISOString(),
    });
  }

  fs.lstat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.download(filePath, filename, (error) => {
      if (!error) return;

      logger.error('File download error:', error);
      if (res.headersSent) {
        res.destroy(error);
        return;
      }

      res.status(500).json({
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: 'Failed to download file' },
        timestamp: new Date().toISOString(),
      });
    });
  });
});

export default router;
