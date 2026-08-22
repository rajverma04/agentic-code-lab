import { prisma } from '../../database/db';
import { RepositoryHealthReport } from '@vocallab/shared';

export class HealthService {
  public async generateHealthReport(repositoryId: string): Promise<RepositoryHealthReport> {
    const symbols = await prisma.symbol.findMany({ where: { repositoryId } });
    const dependencies = await prisma.dependency.findMany({ where: { repositoryId } });

    // 1. Detect Circular Dependencies (A -> B -> A)
    const cycles: { cycle: string[] }[] = [];
    const depMap = new Map<string, string[]>();

    dependencies.forEach((d) => {
      const targets = depMap.get(d.sourceFile) || [];
      targets.push(d.targetFile);
      depMap.set(d.sourceFile, targets);
    });

    depMap.forEach((targets, source) => {
      targets.forEach((target) => {
        const reverseTargets = depMap.get(target) || [];
        if (reverseTargets.includes(source)) {
          const key = [source, target].sort().join('<->');
          if (!cycles.some((c) => c.cycle.sort().join('<->') === key)) {
            cycles.push({ cycle: [source, target] });
          }
        }
      });
    });

    // 2. Identify Complex Functions (> 50 lines)
    const complexFunctions = symbols
      .filter((s) => s.endLine - s.startLine > 50)
      .map((s) => ({
        symbolName: s.name,
        filePath: s.filePath,
        lines: s.endLine - s.startLine + 1,
      }));

    // 3. Identify Dead Code Candidates (symbols never called or imported elsewhere)
    const calledNames = new Set<string>();
    dependencies.forEach((d) => {
      if (d.targetSymbol) calledNames.add(d.targetSymbol);
    });

    const deadCodeCandidates = symbols
      .filter((s) => s.exported && !calledNames.has(s.name) && s.type === 'function')
      .slice(0, 5)
      .map((s) => ({
        symbolName: s.name,
        filePath: s.filePath,
        reason: 'Exported function is not called by any external file within repository.',
      }));

    // 4. Calculate Health Score
    let score = 100;
    score -= cycles.length * 10;
    score -= complexFunctions.length * 4;
    score -= deadCodeCandidates.length * 2;
    score = Math.max(30, Math.min(100, score));

    const summary = `Repository health score evaluated at ${score}/100. Identified ${cycles.length} circular dependencies, ${complexFunctions.length} complex functions, and ${deadCodeCandidates.length} unreferenced export symbols.`;

    return {
      score,
      summary,
      circularDependencies: cycles,
      complexFunctions,
      deadCodeCandidates,
      missingErrorHandling: [],
    };
  }
}

export const healthService = new HealthService();
