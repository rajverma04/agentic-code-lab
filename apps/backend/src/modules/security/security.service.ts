import { prisma } from '../../database/db';
import { SecurityAuditReport, SecurityVulnerability } from '@vocallab/shared';

export class SecurityService {
  public async auditRepository(repositoryId: string): Promise<SecurityAuditReport> {
    const files = await prisma.file.findMany({ where: { repositoryId } });
    const chunks = await prisma.codeChunk.findMany({ where: { repositoryId } });

    const vulnerabilities: SecurityVulnerability[] = [];

    // Static Rules
    chunks.forEach((c) => {
      const code = c.code;

      // 1. Detect hardcoded API keys or secrets
      if (/api_key\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(code) || /secret\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(code)) {
        vulnerabilities.push({
          id: `vuln_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          severity: 'CRITICAL',
          title: 'Hardcoded API Secret or Key',
          filePath: c.filePath,
          line: c.startLine,
          description: 'Hardcoded secret token or API key detected in source code string literal.',
          recommendation: 'Move secrets to environment variables (.env) and read via process.env.',
        });
      }

      // 2. Detect raw SQL query concatenation (SQL Injection risk)
      if (/SELECT\s+.*\s+FROM\s+.*(\+|\${)/i.test(code) || /INSERT\s+INTO\s+.*(\+|\${)/i.test(code)) {
        vulnerabilities.push({
          id: `vuln_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          severity: 'HIGH',
          title: 'Potential SQL Injection Vulnerability',
          filePath: c.filePath,
          line: c.startLine,
          description: 'SQL statement constructed via string concatenation or unescaped template literals.',
          recommendation: 'Use parameterized queries, ORM prepared statements (Prisma/TypeORM/Sequelize).',
        });
      }

      // 3. Detect weak hashing algorithms (MD5 / SHA1)
      if (/crypto\.createHash\(['"](md5|sha1)['"]\)/i.test(code)) {
        vulnerabilities.push({
          id: `vuln_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          severity: 'MEDIUM',
          title: 'Weak Hashing Algorithm (MD5/SHA1)',
          filePath: c.filePath,
          line: c.startLine,
          description: 'Use of MD5 or SHA1 cryptographically weak hash functions.',
          recommendation: 'Upgrade to SHA-256 or bcrypt/argon2 for password hashing.',
        });
      }
    });

    // Determine Security Grade
    let score = 100;
    const criticalCount = vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
    const highCount = vulnerabilities.filter((v) => v.severity === 'HIGH').length;
    const mediumCount = vulnerabilities.filter((v) => v.severity === 'MEDIUM').length;

    score -= criticalCount * 25;
    score -= highCount * 15;
    score -= mediumCount * 5;
    score = Math.max(20, Math.min(100, score));

    let grade: SecurityAuditReport['grade'] = 'A+';
    if (score < 50) grade = 'F';
    else if (score < 70) grade = 'C';
    else if (score < 85) grade = 'B';
    else if (score < 95) grade = 'A';

    const summary = `Security audit score ${score}/100 (Grade ${grade}). Identified ${criticalCount} critical, ${highCount} high, and ${mediumCount} medium risk vulnerabilities across ${files.length} repository files.`;

    return {
      grade,
      score,
      summary,
      vulnerabilities,
    };
  }
}

export const securityService = new SecurityService();
