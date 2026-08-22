import { Project, SyntaxKind, Node } from 'ts-morph';
import { SymbolType } from '@vocallab/shared';

export interface ExtractedSymbol {
  name: string;
  type: SymbolType;
  startLine: number;
  endLine: number;
  docstring?: string;
  signature?: string;
  exported: boolean;
  calls: string[];
  imports: string[];
}

export class AstService {
  public parseTypeScriptJsFile(filePath: string, content: string): ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];

    try {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: { allowJs: true, jsx: 1 },
      });

      const sourceFile = project.createSourceFile(filePath, content);

      // 1. Extract Imports (ES6 + CommonJS require)
      const imports: string[] = [];
      sourceFile.getImportDeclarations().forEach((imp) => {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        imports.push(moduleSpecifier);
      });

      // Extract CommonJS require('...') calls
      const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      for (const match of requireMatches) {
        if (match[1]) imports.push(match[1]);
      }

      // Extract dynamic import('...') calls
      const dynamicImportMatches = content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      for (const match of dynamicImportMatches) {
        if (match[1]) imports.push(match[1]);
      }

      // Helper to extract function calls inside a AST node
      const getCallExpressions = (node: Node): string[] => {
        const calls: string[] = [];
        node.forEachDescendant((descendant) => {
          if (Node.isCallExpression(descendant)) {
            const expr = descendant.getExpression();
            calls.push(expr.getText().trim());
          }
        });
        return Array.from(new Set(calls));
      };

      // 2. Extract Functions
      sourceFile.getFunctions().forEach((fn) => {
        const name = fn.getName() || 'anonymous';
        const startLine = fn.getStartLineNumber();
        const endLine = fn.getEndLineNumber();
        const exported = fn.isExported();
        const docstring = fn.getJsDocs().map((doc) => doc.getCommentText()).join('\n') || undefined;
        const signature = `function ${name}(${fn.getParameters().map((p) => p.getText()).join(', ')})`;
        const calls = getCallExpressions(fn);

        symbols.push({
          name,
          type: 'function',
          startLine,
          endLine,
          docstring,
          signature,
          exported,
          calls,
          imports,
        });
      });

      // 3. Extract Classes & Methods
      sourceFile.getClasses().forEach((cls) => {
        const className = cls.getName() || 'AnonymousClass';
        const startLine = cls.getStartLineNumber();
        const endLine = cls.getEndLineNumber();
        const exported = cls.isExported();
        const docstring = cls.getJsDocs().map((doc) => doc.getCommentText()).join('\n') || undefined;
        const signature = `class ${className}`;
        const calls = getCallExpressions(cls);

        symbols.push({
          name: className,
          type: 'class',
          startLine,
          endLine,
          docstring,
          signature,
          exported,
          calls,
          imports,
        });

        // Class Methods
        cls.getMethods().forEach((method) => {
          const methodName = `${className}.${method.getName()}`;
          const mStart = method.getStartLineNumber();
          const mEnd = method.getEndLineNumber();
          const mSignature = `${method.getName()}(${method.getParameters().map((p) => p.getText()).join(', ')})`;
          const mCalls = getCallExpressions(method);

          symbols.push({
            name: methodName,
            type: 'method',
            startLine: mStart,
            endLine: mEnd,
            signature: mSignature,
            exported,
            calls: mCalls,
            imports,
          });
        });
      });

      // 4. Extract Interfaces
      sourceFile.getInterfaces().forEach((iface) => {
        symbols.push({
          name: iface.getName(),
          type: 'interface',
          startLine: iface.getStartLineNumber(),
          endLine: iface.getEndLineNumber(),
          exported: iface.isExported(),
          calls: [],
          imports,
        });
      });

      // 5. Extract Type Aliases
      sourceFile.getTypeAliases().forEach((t) => {
        symbols.push({
          name: t.getName(),
          type: 'type_alias',
          startLine: t.getStartLineNumber(),
          endLine: t.getEndLineNumber(),
          exported: t.isExported(),
          calls: [],
          imports,
        });
      });
    } catch (err: any) {
      console.warn(`[AstService] TS AST parsing fallback for ${filePath}: ${err.message}`);
    }

    return symbols;
  }

  public parsePythonFile(filePath: string, content: string): ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    const lines = content.split(/\r\n|\r|\n/);

    const imports: string[] = [];
    const funcRegex = /^\s*def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/;
    const classRegex = /^\s*class\s+([a-zA-Z0-9_]+)/;
    const importRegex = /^\s*(?:from\s+[\w.]+\s+)?import\s+([\w.,\s]+)/;

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      const impMatch = line.match(importRegex);
      if (impMatch) {
        imports.push(impMatch[1].trim());
      }

      const classMatch = line.match(classRegex);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          startLine: lineNum,
          endLine: Math.min(lineNum + 30, lines.length),
          exported: true,
          calls: [],
          imports,
        });
      }

      const funcMatch = line.match(funcRegex);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          type: 'function',
          startLine: lineNum,
          endLine: Math.min(lineNum + 20, lines.length),
          signature: `def ${funcMatch[1]}(${funcMatch[2]})`,
          exported: true,
          calls: [],
          imports,
        });
      }
    });

    return symbols;
  }

  public extractSymbols(filePath: string, content: string, language: string): ExtractedSymbol[] {
    const langLower = language.toLowerCase();
    if (langLower.includes('typescript') || langLower.includes('javascript')) {
      return this.parseTypeScriptJsFile(filePath, content);
    } else if (langLower.includes('python')) {
      return this.parsePythonFile(filePath, content);
    }

    // Generic fallback symbol extraction (regex-based)
    return this.parsePythonFile(filePath, content);
  }
}

export const astService = new AstService();
