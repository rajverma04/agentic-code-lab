import { ExtractedSymbol } from '../ast/ast.service';
import { SymbolType } from '@vocallab/shared';

export interface SemanticChunkInput {
  filePath: string;
  content: string;
  symbols: ExtractedSymbol[];
}

export interface GeneratedChunk {
  filePath: string;
  symbolName?: string;
  symbolType?: SymbolType;
  code: string;
  startLine: number;
  endLine: number;
  summary: string;
  dependencies: string[];
}

export class SemanticChunker {
  public chunkFile(input: SemanticChunkInput): GeneratedChunk[] {
    const { filePath, content, symbols } = input;
    const lines = content.split(/\r\n|\r|\n/);
    const chunks: GeneratedChunk[] = [];

    if (symbols.length === 0 || lines.length <= 40) {
      // Small file or no symbols: chunk as complete file
      chunks.push({
        filePath,
        code: content,
        startLine: 1,
        endLine: lines.length,
        summary: `Complete file: ${filePath}`,
        dependencies: [],
      });
      return chunks;
    }

    // Chunk based on AST symbol boundaries
    const coveredLines = new Set<number>();

    for (const sym of symbols) {
      const symbolLines = lines.slice(sym.startLine - 1, sym.endLine);
      const code = symbolLines.join('\n');

      if (code.trim().length > 0) {
        for (let i = sym.startLine; i <= sym.endLine; i++) {
          coveredLines.add(i);
        }

        const summary = `${sym.type.toUpperCase()} ${sym.name} (${filePath}:${sym.startLine}-${sym.endLine})`;
        chunks.push({
          filePath,
          symbolName: sym.name,
          symbolType: sym.type,
          code,
          startLine: sym.startLine,
          endLine: sym.endLine,
          summary,
          dependencies: [...(sym.calls || []), ...(sym.imports || [])],
        });
      }
    }

    // Catch remaining uncoverable top-level statements/imports
    const uncoveredLines: string[] = [];
    let startUncovered = 1;

    for (let i = 1; i <= lines.length; i++) {
      if (!coveredLines.has(i)) {
        if (uncoveredLines.length === 0) startUncovered = i;
        uncoveredLines.push(lines[i - 1]);
      } else {
        if (uncoveredLines.length > 5) {
          chunks.push({
            filePath,
            code: uncoveredLines.join('\n'),
            startLine: startUncovered,
            endLine: i - 1,
            summary: `Module context/imports in ${filePath}:${startUncovered}-${i - 1}`,
            dependencies: [],
          });
        }
        uncoveredLines.length = 0;
      }
    }

    if (uncoveredLines.length > 5) {
      chunks.push({
        filePath,
        code: uncoveredLines.join('\n'),
        startLine: startUncovered,
        endLine: lines.length,
        summary: `Module context/imports in ${filePath}:${startUncovered}-${lines.length}`,
        dependencies: [],
      });
    }

    return chunks;
  }
}

export const semanticChunker = new SemanticChunker();
