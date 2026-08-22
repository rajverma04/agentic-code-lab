import { embeddingService } from '../llm/embedding.service';
import { qdrantService } from '../vectorstore/qdrant.service';
import { llmService } from '../llm/llm.service';
import { prisma } from '../../database/db';
import { ChatMessage, CodeFlowStep } from '@vocallab/shared';

export interface RAGQueryInput {
  repositoryId: string;
  chatId: string;
  question: string;
  selectedFilePath?: string;
}

export class RagService {
  public async answerQuestion(input: RAGQueryInput): Promise<ChatMessage> {
    const { repositoryId, chatId, question, selectedFilePath } = input;

    // 1. Generate query vector embedding
    const queryEmbedding = await embeddingService.generateEmbedding(question);

    let searchResults: { score: number; payload: any }[] = [];

    // 1. If Selected File Mode is active, retrieve chunks for selectedFilePath directly from DB
    if (selectedFilePath) {
      const fileChunks = await prisma.codeChunk.findMany({
        where: { repositoryId, filePath: selectedFilePath },
        orderBy: { startLine: 'asc' },
      });

      if (fileChunks.length > 0) {
        searchResults = fileChunks.map((c) => ({
          score: 1.0,
          payload: {
            chunkId: c.id,
            repositoryId,
            filePath: c.filePath,
            symbolName: c.symbolName || undefined,
            symbolType: c.symbolType || undefined,
            code: c.code,
            startLine: c.startLine,
            endLine: c.endLine,
            summary: c.summary || `File: ${c.filePath}`,
          },
        }));
      }
    }

    // 2. If no selected file mode or no file chunks found, run vector + DB keyword search
    if (searchResults.length === 0) {
      searchResults = await qdrantService.search(repositoryId, queryEmbedding, 6);

      // Routing / Entry Point Query Prioritization
      if (/route|routing|entry|flow|http/i.test(question)) {
        const routeChunks = await prisma.codeChunk.findMany({
          where: {
            repositoryId,
            OR: [
              { filePath: { contains: 'route' } },
              { filePath: { contains: 'index' } },
              { filePath: { contains: 'server' } },
              { filePath: { contains: 'app' } },
              { filePath: { contains: 'controller' } },
            ],
          },
          take: 4,
        });

        routeChunks.forEach((rc) => {
          if (!searchResults.some((r) => r.payload.chunkId === rc.id)) {
            searchResults.unshift({
              score: 0.98,
              payload: {
                chunkId: rc.id,
                repositoryId,
                filePath: rc.filePath,
                symbolName: rc.symbolName || undefined,
                symbolType: rc.symbolType || undefined,
                code: rc.code,
                startLine: rc.startLine,
                endLine: rc.endLine,
                summary: rc.summary || `File: ${rc.filePath}`,
              },
            });
          }
        });
      }

      // Extract search keywords from user question
      const keywords = question
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['how', 'this', 'working', 'what', 'where', 'does', 'that', 'with', 'from', 'explain', 'show'].includes(w));

      if (keywords.length > 0) {
        const keywordChunks = await prisma.codeChunk.findMany({
          where: {
            repositoryId,
            OR: keywords.flatMap((kw) => [
              { filePath: { contains: kw } },
              { symbolName: { contains: kw } },
              { summary: { contains: kw } },
              { code: { contains: kw } },
            ]),
          },
          take: 6,
        });

        keywordChunks.forEach((kc) => {
          if (!searchResults.some((r) => r.payload.chunkId === kc.id)) {
            searchResults.unshift({
              score: 0.95,
              payload: {
                chunkId: kc.id,
                repositoryId,
                filePath: kc.filePath,
                symbolName: kc.symbolName || undefined,
                symbolType: kc.symbolType || undefined,
                code: kc.code,
                startLine: kc.startLine,
                endLine: kc.endLine,
                summary: kc.summary || `File: ${kc.filePath}`,
              },
            });
          }
        });
      }
    }

    // 3. Build Source Context
    const sources = searchResults.map((r) => ({
      filePath: r.payload.filePath,
      startLine: r.payload.startLine,
      endLine: r.payload.endLine,
      snippet: r.payload.code.slice(0, 300),
      score: r.score,
    }));

    const contextText = searchResults
      .map(
        (r, idx) =>
          `[Source ${idx + 1}]: File: ${r.payload.filePath} (Lines ${r.payload.startLine}-${r.payload.endLine})\n\`\`\`\n${r.payload.code}\n\`\`\``
      )
      .join('\n\n');

    // 4. Construct Prompt
    const systemPrompt = `You are an expert AI Codebase Assistant analyzing a GitHub repository. Answer the user's question accurately using only the provided codebase context and source snippets. Always explain code logic clearly and cite specific files and lines.`;

    const userPrompt = `
User Question: "${question}"

Relevant Codebase Snippets:
${contextText || 'No direct snippet match. Use general repository architecture knowledge.'}

Instructions:
1. Explain how the code handles the user's inquiry step by step.
2. Refer to specific files and symbols mentioned in the context.
3. Keep the response well-structured with markdown headings, bullet points, and code blocks.
`;

    // 5. Generate Response via LLM
    const responseText = await llmService.generateCompletion(userPrompt, systemPrompt);

    // 6. Generate Code Flow Steps if asking about an operation/flow
    const codeFlow: CodeFlowStep[] = searchResults.slice(0, 4).map((r, idx) => ({
      stepIndex: idx + 1,
      title: r.payload.symbolName ? `Execute ${r.payload.symbolName}()` : `Read ${r.payload.filePath}`,
      filePath: r.payload.filePath,
      symbolName: r.payload.symbolName,
      description: r.payload.summary || `Code block in ${r.payload.filePath}`,
      lineRange: `L${r.payload.startLine}-L${r.payload.endLine}`,
      snippet: r.payload.code.slice(0, 150),
    }));

    // 7. Save Assistant Message to DB
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        chatId,
        sender: 'assistant',
        content: responseText,
        sourcesJson: JSON.stringify(sources),
        flowJson: JSON.stringify(codeFlow),
      },
    });

    return {
      id: assistantMessage.id,
      chatId,
      sender: 'assistant',
      content: assistantMessage.content,
      timestamp: assistantMessage.createdAt.toISOString(),
      sources,
      codeFlow,
    };
  }
}

export const ragService = new RagService();
