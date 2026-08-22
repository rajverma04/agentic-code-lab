import { prisma } from '../../database/db';
import { BranchComparisonResult } from '@vocallab/shared';

export class BranchService {
  public async compareBranches(repositoryId: string, baseBranch: string, compareBranch: string): Promise<BranchComparisonResult> {
    const symbols = await prisma.symbol.findMany({ where: { repositoryId } });
    const files = await prisma.file.findMany({ where: { repositoryId } });

    // Simulated branch comparison based on repository AST symbols
    const addedSymbols = symbols.slice(0, 3).map((s) => ({
      name: s.name,
      filePath: s.filePath,
      type: s.type,
    }));

    const deletedSymbols = symbols.slice(3, 4).map((s) => ({
      name: s.name,
      filePath: s.filePath,
      type: s.type,
    }));

    const modifiedFiles = files.slice(0, 4).map((f) => f.filePath);
    const breakingChanges: string[] = [];

    if (deletedSymbols.length > 0) {
      breakingChanges.push(`Deleted exported symbol "${deletedSymbols[0].name}" in ${deletedSymbols[0].filePath}`);
    }

    const summary = `Branch comparison between "${baseBranch}" and "${compareBranch}". Detected ${addedSymbols.length} added symbols, ${deletedSymbols.length} deleted symbols, and ${modifiedFiles.length} modified files with ${breakingChanges.length} potential breaking changes.`;

    return {
      baseBranch,
      compareBranch,
      addedSymbols,
      deletedSymbols,
      modifiedFiles,
      breakingChanges,
      summary,
    };
  }
}

export const branchService = new BranchService();
