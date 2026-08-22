import path from 'path';
import { prisma } from '../../database/db';
import { env } from '../../config/env';
import { githubService } from '../github/github.service';
import { scannerService } from '../scanner/scanner.service';
import { astService } from '../ast/ast.service';
import { graphService } from '../graph/graph.service';
import { semanticChunker } from '../chunker/semantic.chunker';
import { embeddingService } from '../llm/embedding.service';
import { qdrantService, VectorPoint } from '../vectorstore/qdrant.service';
import { architectureService } from '../analysis/architecture.service';

export class RepositoryProcessor {
  public async processRepository(repositoryId: string): Promise<void> {
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) return;

    try {
      // Step 1: CLONING
      await this.updateStatus(repositoryId, 'CLONING', 10, 'Cloning GitHub repository files...');
      const targetDir = path.join(env.REPOS_DIR, repositoryId);
      await githubService.cloneRepository(repo.githubUrl, targetDir);

      // Step 2: SCANNING
      await this.updateStatus(repositoryId, 'SCANNING', 30, 'Scanning directory & detecting languages...');
      const scanResult = scannerService.scanRepository(targetDir);

      // Persist files to Database
      const createdFiles = [];
      for (const f of scanResult.files) {
        const fileRec = await prisma.file.create({
          data: {
            repositoryId,
            filePath: f.relativePath,
            language: f.language,
            sizeBytes: f.sizeBytes,
            lineCount: f.lineCount,
            hash: f.hash,
            type: f.type,
          },
        });
        createdFiles.push({ ...f, id: fileRec.id });
      }

      // Step 3: PARSING AST
      await this.updateStatus(repositoryId, 'PARSING_AST', 50, 'Parsing AST & extracting functions/classes...');
      const allExtractedSymbols = [];

      for (const f of createdFiles) {
        const symbols = astService.extractSymbols(f.relativePath, f.content, f.language);

        for (const s of symbols) {
          const symRecord = await prisma.symbol.create({
            data: {
              repositoryId,
              fileId: f.id,
              filePath: f.relativePath,
              name: s.name,
              type: s.type,
              startLine: s.startLine,
              endLine: s.endLine,
              docstring: s.docstring,
              signature: s.signature,
              exported: s.exported,
              callsJson: JSON.stringify(s.calls),
              importsJson: JSON.stringify(s.imports),
            },
          });

          allExtractedSymbols.push({
            id: symRecord.id,
            filePath: f.relativePath,
            name: s.name,
            type: s.type,
            startLine: s.startLine,
            endLine: s.endLine,
            calls: s.calls || [],
            imports: s.imports || [],
          });
        }
      }

      // Step 4: GENERATING GRAPH
      await this.updateStatus(repositoryId, 'GENERATING_GRAPH', 65, 'Building dependency & call graph edges...');
      const graphData = graphService.buildDependencyGraph(
        createdFiles.map((f) => ({ filePath: f.relativePath, language: f.language, imports: [] })),
        allExtractedSymbols
      );

      for (const edge of graphData.edges) {
        await prisma.dependency.create({
          data: {
            repositoryId,
            sourceFile: edge.source,
            targetFile: edge.target,
            edgeType: edge.edgeType,
          },
        });
      }

      // Step 5: CHUNKING & EMBEDDING
      await this.updateStatus(repositoryId, 'CHUNKING', 75, 'Semantically chunking code blocks...');
      const vectorPoints: VectorPoint[] = [];
      let totalChunkCount = 0;

      for (const f of createdFiles) {
        const fileSymbols = allExtractedSymbols.filter((s) => s.filePath === f.relativePath) as any;
        const chunks = semanticChunker.chunkFile({
          filePath: f.relativePath,
          content: f.content,
          symbols: fileSymbols,
        });

        for (const c of chunks) {
          totalChunkCount++;
          const chunkRecord = await prisma.codeChunk.create({
            data: {
              repositoryId,
              filePath: c.filePath,
              symbolName: c.symbolName,
              symbolType: c.symbolType,
              code: c.code,
              startLine: c.startLine,
              endLine: c.endLine,
              summary: c.summary,
              depsJson: JSON.stringify(c.dependencies),
            },
          });

          // Step 6: Vector Embedding
          const vector = await embeddingService.generateEmbedding(`${c.summary}\n${c.code}`);
          vectorPoints.push({
            id: chunkRecord.id,
            vector,
            payload: {
              chunkId: chunkRecord.id,
              repositoryId,
              filePath: c.filePath,
              symbolName: c.symbolName,
              symbolType: c.symbolType,
              code: c.code,
              startLine: c.startLine,
              endLine: c.endLine,
              summary: c.summary,
            },
          });
        }
      }

      await this.updateStatus(repositoryId, 'EMBEDDING', 90, 'Upserting vectors into Qdrant store...');
      await qdrantService.upsertPoints(vectorPoints);

      // Step 7: Architecture Overview
      const archSummary = architectureService.analyzeArchitecture(
        repositoryId,
        createdFiles.map((f) => ({ filePath: f.relativePath, content: f.content }))
      );

      await prisma.analysisResult.create({
        data: {
          repositoryId,
          analysisType: 'architecture',
          resultJson: JSON.stringify(archSummary),
        },
      });

      // Finalize READY
      await prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'READY',
          progressPercentage: 100,
          currentStepMessage: 'Repository processing complete!',
          fileCount: createdFiles.length,
          symbolCount: allExtractedSymbols.length,
          chunkCount: totalChunkCount,
          languageBreakdown: JSON.stringify(scanResult.languageBreakdown),
        },
      });

      console.log(`[RepositoryProcessor] Repository ${repositoryId} successfully processed and READY.`);
    } catch (err: any) {
      console.error(`[RepositoryProcessor] Error processing repository ${repositoryId}: ${err.message}`);
      await this.updateStatus(repositoryId, 'FAILED', 0, `Processing failed: ${err.message}`);
    }
  }

  private async updateStatus(id: string, status: string, progress: number, message: string) {
    await prisma.repository.update({
      where: { id },
      data: {
        status,
        progressPercentage: progress,
        currentStepMessage: message,
      },
    });
  }
}

export const repositoryProcessor = new RepositoryProcessor();
