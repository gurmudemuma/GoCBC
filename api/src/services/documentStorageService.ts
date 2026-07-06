/**
 * Document Storage Service
 * 
 * Hybrid off-chain document storage:
 * 1. IPFS for distributed, immutable storage
 * 2. Local file system as fallback
 * 3. Document hashes stored on blockchain for verification
 * 4. AES-256 encryption at rest
 * 
 * Best practices for blockchain document management:
 * - Store only document hash on-chain (gas efficiency)
 * - Store actual documents off-chain (scalability)
 * - Use IPFS CID as content-addressed reference
 * - Encrypt sensitive documents
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import logger from '../utils/logger';

interface DocumentMetadata {
  documentId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  hash: string;
  ipfsCID?: string;
  encrypted: boolean;
  category: string; // 'BILL_OF_LADING', 'INVOICE', 'CERTIFICATE', etc.
}

class DocumentStorageService {
  private static instance: DocumentStorageService;
  private ipfsClient: IPFSHTTPClient | null = null;
  private localStoragePath: string;
  private encryptionKey: Buffer;
  private useIPFS: boolean;

  private constructor() {
    // Local storage path
    this.localStoragePath = path.join(process.cwd(), 'storage', 'documents');
    
    // Encryption key from environment or generate
    const keyString = process.env.DOCUMENT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(keyString.slice(0, 64), 'hex');
    
    // IPFS configuration
    this.useIPFS = process.env.USE_IPFS === 'true';
    
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      // Create local storage directory
      await fs.mkdir(this.localStoragePath, { recursive: true });
      logger.info('✅ Local document storage initialized', { path: this.localStoragePath });

      // Initialize IPFS if enabled
      if (this.useIPFS) {
        try {
          const ipfsHost = process.env.IPFS_HOST || 'localhost';
          const ipfsPort = process.env.IPFS_PORT || '5001';
          
          this.ipfsClient = create({
            host: ipfsHost,
            port: parseInt(ipfsPort),
            protocol: 'http'
          });

          // Test IPFS connection
          const version = await this.ipfsClient.version();
          logger.info('✅ IPFS client initialized', { 
            host: ipfsHost, 
            port: ipfsPort,
            version: version.version 
          });
        } catch (ipfsError) {
          logger.warn('⚠️ IPFS not available, using local storage only', { error: ipfsError });
          this.ipfsClient = null;
          this.useIPFS = false;
        }
      } else {
        logger.info('ℹ️ IPFS disabled, using local storage only');
      }
    } catch (error) {
      logger.error('Failed to initialize document storage', { error });
      throw error;
    }
  }

  public static getInstance(): DocumentStorageService {
    if (!DocumentStorageService.instance) {
      DocumentStorageService.instance = new DocumentStorageService();
    }
    return DocumentStorageService.instance;
  }

  /**
   * Upload document with encryption and optional IPFS storage
   */
  async uploadDocument(
    file: Buffer,
    filename: string,
    mimeType: string,
    category: string,
    uploadedBy: string,
    shouldEncrypt: boolean = true
  ): Promise<DocumentMetadata> {
    try {
      const documentId = `DOC_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Encrypt document if required
      let processedData = file;
      if (shouldEncrypt) {
        processedData = this.encryptDocument(file);
      }

      // Calculate hash (before encryption for verification)
      const hash = crypto.createHash('sha256').update(file).digest('hex');

      let ipfsCID: string | undefined;

      // Try IPFS first if available
      if (this.ipfsClient && this.useIPFS) {
        try {
          const result = await this.ipfsClient.add(processedData);
          ipfsCID = result.cid.toString();
          logger.info('✅ Document uploaded to IPFS', { documentId, ipfsCID, size: file.length });
        } catch (ipfsError) {
          logger.warn('⚠️ IPFS upload failed, falling back to local storage', { error: ipfsError });
        }
      }

      // Store locally (always, as backup or primary)
      const localPath = path.join(this.localStoragePath, `${documentId}.bin`);
      await fs.writeFile(localPath, processedData);

      const metadata: DocumentMetadata = {
        documentId,
        filename,
        mimeType,
        size: file.length,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        hash,
        ipfsCID,
        encrypted: shouldEncrypt,
        category,
      };

      // Store metadata
      const metadataPath = path.join(this.localStoragePath, `${documentId}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      logger.info('✅ Document uploaded successfully', { 
        documentId, 
        filename, 
        size: file.length,
        hasIPFS: !!ipfsCID,
        encrypted: shouldEncrypt 
      });

      return metadata;
    } catch (error) {
      logger.error('Failed to upload document', { error, filename });
      throw new Error(`Document upload failed: ${error}`);
    }
  }

  /**
   * Retrieve document with decryption
   */
  async getDocument(documentId: string): Promise<{ data: Buffer; metadata: DocumentMetadata }> {
    try {
      // Load metadata
      const metadataPath = path.join(this.localStoragePath, `${documentId}.meta.json`);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata: DocumentMetadata = JSON.parse(metadataContent);

      let data: Buffer;

      // Try IPFS first if CID exists
      if (metadata.ipfsCID && this.ipfsClient && this.useIPFS) {
        try {
          const chunks: Uint8Array[] = [];
          for await (const chunk of this.ipfsClient.cat(metadata.ipfsCID)) {
            chunks.push(chunk);
          }
          data = Buffer.concat(chunks);
          logger.info('✅ Document retrieved from IPFS', { documentId, ipfsCID: metadata.ipfsCID });
        } catch (ipfsError) {
          logger.warn('⚠️ IPFS retrieval failed, using local storage', { error: ipfsError });
          const localPath = path.join(this.localStoragePath, `${documentId}.bin`);
          data = await fs.readFile(localPath);
        }
      } else {
        // Use local storage
        const localPath = path.join(this.localStoragePath, `${documentId}.bin`);
        data = await fs.readFile(localPath);
      }

      // Decrypt if encrypted
      if (metadata.encrypted) {
        data = this.decryptDocument(data);
      }

      // Verify hash
      const computedHash = crypto.createHash('sha256').update(data).digest('hex');
      if (computedHash !== metadata.hash) {
        throw new Error('Document integrity check failed: hash mismatch');
      }

      logger.info('✅ Document retrieved successfully', { documentId, filename: metadata.filename });

      return { data, metadata };
    } catch (error) {
      logger.error('Failed to retrieve document', { error, documentId });
      throw new Error(`Document retrieval failed: ${error}`);
    }
  }

  /**
   * List documents by category or owner
   */
  async listDocuments(filter?: { category?: string; uploadedBy?: string }): Promise<DocumentMetadata[]> {
    try {
      const files = await fs.readdir(this.localStoragePath);
      const metadataFiles = files.filter(f => f.endsWith('.meta.json'));

      const documents: DocumentMetadata[] = [];

      for (const file of metadataFiles) {
        const metadataPath = path.join(this.localStoragePath, file);
        const content = await fs.readFile(metadataPath, 'utf-8');
        const metadata: DocumentMetadata = JSON.parse(content);

        // Apply filters
        if (filter?.category && metadata.category !== filter.category) continue;
        if (filter?.uploadedBy && metadata.uploadedBy !== filter.uploadedBy) continue;

        documents.push(metadata);
      }

      return documents.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    } catch (error) {
      logger.error('Failed to list documents', { error });
      return [];
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const localPath = path.join(this.localStoragePath, `${documentId}.bin`);
      const metadataPath = path.join(this.localStoragePath, `${documentId}.meta.json`);

      await fs.unlink(localPath);
      await fs.unlink(metadataPath);

      logger.info('✅ Document deleted', { documentId });
      return true;
    } catch (error) {
      logger.error('Failed to delete document', { error, documentId });
      return false;
    }
  }

  /**
   * Encrypt document using AES-256-GCM
   */
  private encryptDocument(data: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt document using AES-256-GCM
   */
  private decryptDocument(data: Buffer): Buffer {
    const iv = data.slice(0, 16);
    const authTag = data.slice(16, 32);
    const encrypted = data.slice(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Get IPFS gateway URL for document
   */
  getIPFSGatewayURL(ipfsCID: string): string {
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    return `${gateway}${ipfsCID}`;
  }

  /**
   * Pin document to IPFS (ensure it stays available)
   */
  async pinDocument(ipfsCID: string): Promise<boolean> {
    if (!this.ipfsClient || !this.useIPFS) {
      return false;
    }

    try {
      await this.ipfsClient.pin.add(ipfsCID);
      logger.info('✅ Document pinned to IPFS', { ipfsCID });
      return true;
    } catch (error) {
      logger.error('Failed to pin document to IPFS', { error, ipfsCID });
      return false;
    }
  }
}

export default DocumentStorageService;
