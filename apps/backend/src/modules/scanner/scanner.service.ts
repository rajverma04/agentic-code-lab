import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { detectLanguage, shouldIgnoreDirectory, shouldIgnoreFile } from './language.detector';

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  hash: string;
  content: string;
  type: 'source' | 'config' | 'doc' | 'other';
}

export interface ScanResult {
  files: ScannedFile[];
  totalFiles: number;
  totalSizeBytes: number;
  languageBreakdown: Record<string, number>;
}

export class ScannerService {
  public scanRepository(repoPath: string): ScanResult {
    const files: ScannedFile[] = [];
    const languageBreakdown: Record<string, number> = {};
    let totalSizeBytes = 0;

    const walk = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.relative(repoPath, fullPath);

        if (entry.isDirectory()) {
          if (!shouldIgnoreDirectory(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          if (!shouldIgnoreFile(entry.name)) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size > 2 * 1024 * 1024) {
                // Ignore files > 2MB
                continue;
              }

              const content = fs.readFileSync(fullPath, 'utf-8');
              const language = detectLanguage(fullPath);
              const lineCount = content.split(/\r\n|\r|\n/).length;
              const hash = crypto.createHash('sha256').update(content).digest('hex');

              let fileType: 'source' | 'config' | 'doc' | 'other' = 'source';
              if (['JSON', 'YAML', 'Dockerfile', 'Makefile'].includes(language)) fileType = 'config';
              if (['Markdown'].includes(language)) fileType = 'doc';

              files.push({
                relativePath: relPath,
                absolutePath: fullPath,
                language,
                sizeBytes: stat.size,
                lineCount,
                hash,
                content,
                type: fileType,
              });

              languageBreakdown[language] = (languageBreakdown[language] || 0) + 1;
              totalSizeBytes += stat.size;
            } catch (err) {
              // Skip unreadable binary/encoding files
            }
          }
        }
      }
    };

    walk(repoPath);

    return {
      files,
      totalFiles: files.length,
      totalSizeBytes,
      languageBreakdown,
    };
  }
}

export const scannerService = new ScannerService();
