import { prisma } from '../../database/db';
import { ImpactAnalysisResult } from '@vocallab/shared';
import { LlmService } from '../llm/llm.service';

const llmService = new LlmService();

export class ImpactService {
  public async analyzeImpact(repositoryId: string, targetSymbolName: string): Promise<ImpactAnalysisResult> {
    const cleanTargetName = targetSymbolName.trim();
    const cleanLower = cleanTargetName.toLowerCase();
    const cleanBase = cleanTargetName.split('.').shift()?.split('/').pop() || cleanTargetName;

    // 1. Locate Target Symbol and Target File
    const symbols = await prisma.symbol.findMany({ where: { repositoryId } });
    const files = await prisma.file.findMany({ where: { repositoryId } });

    let targetSymbol = symbols.find(
      (s) =>
        s.name.toLowerCase() === cleanLower ||
        s.name.toLowerCase().endsWith(`.${cleanLower}`) ||
        s.filePath.toLowerCase().includes(cleanLower)
    );

    let targetFile = 'Unknown File';
    if (targetSymbol) {
      targetFile = targetSymbol.filePath;
    } else {
      const matchedFile = files.find((f) => f.filePath.toLowerCase().includes(cleanLower));
      if (matchedFile) targetFile = matchedFile.filePath;
    }

    // 2. Discover Dependent Callers & Importing Modules
    const affectedFilesMap = new Map<string, { reason: string; impactType: ImpactAnalysisResult['affectedFiles'][0]['impactType'] }>();

    // A. Search symbols for calls to target
    symbols.forEach((s) => {
      if (s.filePath === targetFile) return;

      let calls: string[] = [];
      try {
        calls = JSON.parse(s.callsJson || '[]');
      } catch (e) {}

      if (calls.some((c) => c.toLowerCase().includes(cleanLower) || c.toLowerCase().includes(cleanBase.toLowerCase()))) {
        affectedFilesMap.set(s.filePath, {
          reason: `Symbol "${s.name}()" invokes target "${cleanTargetName}"`,
          impactType: 'direct_caller',
        });
      }
    });

    // B. Search file imports for references to targetFile or cleanBase
    symbols.forEach((s) => {
      if (s.filePath === targetFile || affectedFilesMap.has(s.filePath)) return;

      let imports: string[] = [];
      try {
        imports = JSON.parse(s.importsJson || '[]');
      } catch (e) {}

      const cleanTargetBasename = targetFile.split('/').pop()?.replace(/\.[^/.]+$/, '') || cleanBase;
      if (imports.some((imp) => imp.toLowerCase().includes(cleanLower) || imp.toLowerCase().includes(cleanTargetBasename.toLowerCase()))) {
        affectedFilesMap.set(s.filePath, {
          reason: `Imports module "${cleanTargetBasename}"`,
          impactType: 'direct_caller',
        });
      }
    });

    // C. Search code chunks for usage
    const chunks = await prisma.codeChunk.findMany({
      where: {
        repositoryId,
        code: { contains: cleanBase },
      },
      take: 10,
    });

    chunks.forEach((c) => {
      if (c.filePath !== targetFile && !affectedFilesMap.has(c.filePath)) {
        affectedFilesMap.set(c.filePath, {
          reason: `References symbol "${cleanBase}" in file code`,
          impactType: 'indirect_caller',
        });
      }
    });

    // Build affected files list
    const affectedFiles: ImpactAnalysisResult['affectedFiles'] = Array.from(affectedFilesMap.entries()).map(([fp, info]) => ({
      filePath: fp,
      reason: info.reason,
      impactType: info.impactType,
    }));

    // Classify APIs and Components
    const affectedAPIs = new Set<string>();
    const affectedComponents = new Set<string>();

    affectedFiles.forEach((af) => {
      const fp = af.filePath.toLowerCase();
      if (fp.includes('route') || fp.includes('controller') || fp.includes('api')) {
        affectedAPIs.add(af.filePath);
      }
      if (fp.includes('component') || fp.includes('page') || fp.includes('view') || fp.endsWith('.jsx') || fp.endsWith('.tsx')) {
        affectedComponents.add(af.filePath);
      }
    });

    // Determine Risk Level
    let riskLevel: ImpactAnalysisResult['riskLevel'] = 'LOW';
    const isCoreModule = /model|db|schema|auth|passport|user|config/i.test(targetFile);

    if (affectedFiles.length > 6 || (isCoreModule && affectedFiles.length > 2)) {
      riskLevel = 'CRITICAL';
    } else if (affectedFiles.length > 3 || affectedAPIs.size > 1) {
      riskLevel = 'HIGH';
    } else if (affectedFiles.length > 0) {
      riskLevel = 'MEDIUM';
    }

    // Generate AI Impact Analysis Summary via LLM
    const systemPrompt = `You are a Senior Software Architect. Provide a clear, highly readable 2-sentence executive summary of the code impact and refactoring risk. Do not output thinking process, scratchpad reasoning, or <think> tags. Output only clear plain text.`;

    const prompt = `Target Symbol: "${cleanTargetName}" in file "${targetFile}".
Affected Dependent Files Count: ${affectedFiles.length}.
Affected API Endpoints: ${Array.from(affectedAPIs).join(', ') || 'None'}.
Affected UI Components: ${Array.from(affectedComponents).join(', ') || 'None'}.

Provide a concise 2-sentence summary of the blast radius and refactoring risk.`;

    let summary = `Modifying "${cleanTargetName}" in \`${targetFile}\` carries a ${riskLevel} refactoring risk due to coupling across ${affectedFiles.length} dependent modules (${affectedAPIs.size} API endpoints, ${affectedComponents.size} UI components).`;
    try {
      const aiSummary = await llmService.generateCompletion(prompt, systemPrompt);
      const cleaned = aiSummary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (cleaned && !cleaned.includes('Codebase Analysis Insight')) {
        summary = cleaned.replace(/^> \*\*Thinking Process\*\*[\s\S]*?\n\n/i, '').trim();
      }
    } catch (e) {}

    return {
      targetSymbol: cleanTargetName,
      targetFile,
      riskLevel,
      summary,
      affectedFiles,
      affectedAPIs: Array.from(affectedAPIs),
      affectedComponents: Array.from(affectedComponents),
    };
  }
}

export const impactService = new ImpactService();
