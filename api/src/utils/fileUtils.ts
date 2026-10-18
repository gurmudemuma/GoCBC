import path from 'path';
import fs from 'fs';
import { logger } from './logger';

/**
 * Resolves a document's file path by checking multiple possible locations.
 * This handles both absolute paths stored in DB and relative paths that might
 * differ between dev and production environments.
 * 
 * @param storedPath The file path as stored in the database
 * @param fileName The original file name (used as fallback)
 * @returns The resolved absolute file path, or null if not found
 */
export function resolveDocumentPath(storedPath: string | null, fileName?: string): string | null {
  if (!storedPath) return null;

  logger.debug(`Resolving file path: ${storedPath}`);

  // 1. Check if it's already a valid absolute path
  if (path.isAbsolute(storedPath) && fs.existsSync(storedPath)) {
    return storedPath;
  }

  // 2. Try multiple possible base paths for relative paths
  const possiblePaths = [
    // Relative to process CWD
    path.join(process.cwd(), storedPath.replace(/^\//, '')),
    path.join(process.cwd(), 'api', storedPath.replace(/^\//, '')),
    // Relative to the dist/src folder (if running from dist)
    path.join(__dirname, '../..', storedPath),
    path.join(__dirname, '../../..', storedPath),
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      logger.debug(`Resolved file path via base paths: ${testPath}`);
      return testPath;
    }
  }

  // 3. Fallback search by filename in common upload directories
  if (fileName || storedPath) {
    const nameToSearch = fileName || path.basename(storedPath);
    const fallbackDirs = [
      path.join(process.cwd(), 'uploads/documents'),
      path.join(process.cwd(), 'uploads/declarations'),
      path.join(process.cwd(), 'api/uploads/documents'),
      path.join(process.cwd(), 'api/uploads/declarations'),
      path.join(__dirname, '../../uploads/documents'),
      path.join(__dirname, '../../uploads/declarations'),
    ];

    for (const dir of fallbackDirs) {
      if (!fs.existsSync(dir)) continue;

      const fullPath = path.join(dir, nameToSearch);
      if (fs.existsSync(fullPath)) {
        logger.debug(`Resolved file path via fallback directory: ${fullPath}`);
        return fullPath;
      }

      // Fuzzy match (sometimes multer adds prefixes)
      try {
        const files = fs.readdirSync(dir);
        const baseName = nameToSearch.replace(/\.[^/.]+$/, '');
        const matchedFile = files.find(f => 
          f.toLowerCase().includes(baseName.toLowerCase())
        );
        if (matchedFile) {
          const fuzzyPath = path.join(dir, matchedFile);
          logger.debug(`Resolved file path via fuzzy match: ${fuzzyPath}`);
          return fuzzyPath;
        }
      } catch (e) {
        // Skip directory read errors
      }
    }
  }

  logger.warn(`Could not resolve file path for: ${storedPath}`);
  return null;
}
