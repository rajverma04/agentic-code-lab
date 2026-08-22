import { prisma } from '../../database/db';
import { RepositoryApiDocumentation, ApiEndpointDoc } from '@vocallab/shared';

export class DocumentationService {
  public async generateDocumentation(repositoryId: string): Promise<RepositoryApiDocumentation> {
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    const chunks = await prisma.codeChunk.findMany({ where: { repositoryId } });
    const symbols = await prisma.symbol.findMany({ where: { repositoryId } });

    const endpointMap = new Map<string, ApiEndpointDoc>();

    // 1. Scan code chunks for actual HTTP route declarations via Regex (Express, Fastify, Flask, Spring, Next.js)
    chunks.forEach((c) => {
      const code = c.code;

      // Match Express / Fastify / Router endpoints: router.get('/path', ...), app.post('/path', ...)
      const expressRegex = /(?:app|router|server)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
      let match;
      while ((match = expressRegex.exec(code)) !== null) {
        const method = match[1].toUpperCase() as ApiEndpointDoc['method'];
        const path = match[2];
        const key = `${method}:${path}`;

        if (!endpointMap.has(key)) {
          endpointMap.set(key, {
            method,
            path,
            filePath: c.filePath,
            handlerSymbol: c.symbolName || `Handler for ${path}`,
            description: `${method} endpoint declared in ${c.filePath}`,
            parameters: this.extractParameters(path, method),
          });
        }
      }

      // Match Spring Boot / Java annotations: @GetMapping("/path"), @PostMapping("/path")
      const springRegex = /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?['"]([^'"]+)['"]/gi;
      while ((match = springRegex.exec(code)) !== null) {
        const method = match[1].toUpperCase() as ApiEndpointDoc['method'];
        const path = match[2];
        const key = `${method}:${path}`;

        if (!endpointMap.has(key)) {
          endpointMap.set(key, {
            method,
            path,
            filePath: c.filePath,
            handlerSymbol: c.symbolName || `Handler for ${path}`,
            description: `${method} endpoint declared in ${c.filePath}`,
            parameters: this.extractParameters(path, method),
          });
        }
      }
    });

    // 2. Scan AST Symbols if fewer endpoints found
    symbols.forEach((s) => {
      const name = s.name.toLowerCase();
      const fp = s.filePath.toLowerCase();

      if (fp.includes('route') || fp.includes('controller') || fp.includes('api')) {
        let method: ApiEndpointDoc['method'] = 'GET';
        if (name.includes('create') || name.includes('add') || name.includes('post')) method = 'POST';
        else if (name.includes('update') || name.includes('edit') || name.includes('put')) method = 'PUT';
        else if (name.includes('patch')) method = 'PATCH';
        else if (name.includes('delete') || name.includes('remove')) method = 'DELETE';

        const path = `/${s.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`;
        const key = `${method}:${path}`;

        if (!endpointMap.has(key)) {
          endpointMap.set(key, {
            method,
            path,
            handlerSymbol: s.name,
            filePath: s.filePath,
            description: s.docstring || `${method} handler for ${s.name} in ${s.filePath}`,
            parameters: this.extractParameters(path, method),
          });
        }
      }
    });

    const endpoints = Array.from(endpointMap.values());
    const repoTitle = repo ? repo.name : 'API Reference';

    // 3. Build OpenAPI 3.0 Spec JSON
    const openApiPaths: Record<string, any> = {};
    endpoints.forEach((e) => {
      const methodKey = e.method.toLowerCase();
      openApiPaths[e.path] = openApiPaths[e.path] || {};
      openApiPaths[e.path][methodKey] = {
        summary: e.handlerSymbol,
        description: e.description,
        operationId: e.handlerSymbol,
        parameters: e.parameters?.map((p) => ({
          name: p.name,
          in: e.path.includes(`:${p.name}`) ? 'path' : 'query',
          required: p.required,
          schema: { type: p.type },
        })),
        responses: {
          '200': { description: 'Successful operation' },
          '400': { description: 'Bad request / Invalid parameters' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Internal server error' },
        },
      };
    });

    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: `${repoTitle} API Specification`,
        version: '1.0.0',
        description: `Auto-generated OpenAPI 3.0 documentation for ${repoTitle}. Total endpoints: ${endpoints.length}.`,
      },
      servers: [{ url: 'http://localhost:4000/api' }],
      paths: openApiPaths,
    };

    // 4. Build Markdown Doc
    let markdownDoc = `# ${repoTitle} API Documentation\n\n`;
    markdownDoc += `Auto-generated REST API specification derived from AST route declarations, code chunks, and controller handlers. Discovered **${endpoints.length} endpoints**.\n\n`;

    endpoints.forEach((e) => {
      markdownDoc += `### \`${e.method}\` \`${e.path}\`\n`;
      markdownDoc += `- **Handler**: \`${e.handlerSymbol}\`\n`;
      markdownDoc += `- **Source File**: \`${e.filePath}\`\n`;
      markdownDoc += `- **Description**: ${e.description}\n`;
      if (e.parameters && e.parameters.length > 0) {
        markdownDoc += `- **Parameters**: ${e.parameters.map((p) => `\`${p.name}\` (${p.type})`).join(', ')}\n`;
      }
      markdownDoc += `\n`;
    });

    return {
      title: `${repoTitle} API Reference`,
      version: '1.0.0',
      baseUrl: 'http://localhost:4000/api',
      endpoints,
      markdownDoc,
      openApiJson: JSON.stringify(openApiSpec, null, 2),
    };
  }

  private extractParameters(path: string, method: string) {
    const params: { name: string; type: string; required: boolean }[] = [];

    // Extract path variables like :id or {id}
    const pathVars = path.match(/:([a-zA-Z0-9_]+)|\{([a-zA-Z0-9_]+)\}/g);
    if (pathVars) {
      pathVars.forEach((pv) => {
        const cleanName = pv.replace(/[:{} me]/g, '');
        params.push({ name: cleanName, type: 'string', required: true });
      });
    }

    if (method !== 'GET') {
      params.push({ name: 'body', type: 'object', required: true });
    }

    return params;
  }
}

export const documentationService = new DocumentationService();
