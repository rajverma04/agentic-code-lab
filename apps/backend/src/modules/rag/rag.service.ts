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

    // Detect if user is asking a broad/global repository question
    const isGlobalQuestion = /all api|all route|list api|all endpoint|file path|structure|architecture|how to|overall/i.test(question);

    // 1. Generate query vector embedding
    const queryEmbedding = await embeddingService.generateEmbedding(question);

    let searchResults: { score: number; payload: any }[] = [];

    // 2. Selected File Mode (only restrict strictly if NOT asking a global question)
    if (selectedFilePath && !isGlobalQuestion) {
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

    // 3. Global Vector Search + Broad Repository Context Retrieval
    if (searchResults.length === 0 || isGlobalQuestion) {
      const vectorMatches = await qdrantService.search(repositoryId, queryEmbedding, 10);
      searchResults = [...searchResults, ...vectorMatches];

      // Route / API / Controller Prioritization
      if (/api|route|endpoint|controller|server|backend|app/i.test(question)) {
        const routeChunks = await prisma.codeChunk.findMany({
          where: {
            repositoryId,
            OR: [
              { filePath: { contains: 'route' } },
              { filePath: { contains: 'api' } },
              { filePath: { contains: 'controller' } },
              { filePath: { contains: 'server' } },
              { filePath: { contains: 'app' } },
              { filePath: { contains: 'index' } },
            ],
          },
          take: 8,
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

      // Keyword Search Fallback
      const keywords = question
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['how', 'this', 'working', 'what', 'where', 'does', 'that', 'with', 'from', 'explain', 'show', 'give', 'list'].includes(w));

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

    // 4. Also fetch Repository File Tree & API Symbols for complete overview
    const repoFiles = await prisma.file.findMany({
      where: { repositoryId },
      select: { filePath: true, language: true },
      take: 50,
    });

    const fileListText = repoFiles.map((f) => `- ${f.filePath} (${f.language})`).join('\n');

    // 5. Build Source Context
    const sources = searchResults.slice(0, 10).map((r) => ({
      filePath: r.payload.filePath,
      startLine: r.payload.startLine,
      endLine: r.payload.endLine,
      snippet: r.payload.code.slice(0, 300),
      score: r.score,
    }));

    const contextText = searchResults
      .slice(0, 10)
      .map(
        (r, idx) =>
          `[Source ${idx + 1}]: File: ${r.payload.filePath} (Lines ${r.payload.startLine}-${r.payload.endLine})\n\`\`\`\n${r.payload.code}\n\`\`\``
      )
      .join('\n\n');

    // 6. Construct System & User Prompts
    const systemPrompt = `You are an expert AI Codebase Assistant. Answer the user's inquiry with extreme precision and detail based on the provided codebase context and file structure.
Do NOT output internal <think> reasoning blocks. Directly provide a clean, professional, well-formatted Markdown response with headings, tables, bullet points, and exact file paths.`;

    const userPrompt = `
User Question: "${question}"

Repository File Structure Overview:
${fileListText}

Relevant Codebase Snippets:
${contextText || 'No direct snippet match. Use repository file tree structure to answer.'}

Instructions:
1. Provide a comprehensive, structured response answering the question in full.
2. If asking for APIs/routes/endpoints, list all discovered endpoints, their purpose/function, HTTP methods, and exact file paths.
3. Use clear GitHub-style Markdown formatting with code blocks, tables, and bullet points.
`;

    // 7. Generate Response via LLM
    let responseText = await llmService.generateCompletion(userPrompt, systemPrompt);

    // Strip any remaining <think> tags
    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 8. Generate Code Flow Steps if applicable
    const codeFlow: CodeFlowStep[] = searchResults.slice(0, 4).map((r, idx) => ({
      stepIndex: idx + 1,
      title: r.payload.symbolName ? `Execute ${r.payload.symbolName}()` : `Read ${r.payload.filePath}`,
      filePath: r.payload.filePath,
      symbolName: r.payload.symbolName,
      description: r.payload.summary || `Code block in ${r.payload.filePath}`,
      lineRange: `L${r.payload.startLine}-L${r.payload.endLine}`,
      snippet: r.payload.code.slice(0, 150),
    }));

    // 9. Save Assistant Message to DB
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
