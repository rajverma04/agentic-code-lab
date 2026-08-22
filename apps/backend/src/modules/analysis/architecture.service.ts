import { ArchitectureSummary } from '@vocallab/shared';
import { llmService } from '../llm/llm.service';

export interface FileSummaryInput {
  filePath: string;
  content: string;
}

export class ArchitectureService {
  public async analyzeArchitecture(repositoryId: string, files: FileSummaryInput[]): Promise<ArchitectureSummary> {
    const frameworks: string[] = [];
    const languages = new Set<string>();
    const databases: string[] = [];
    let projectType = 'Web Application';
    let authMethod = 'JWT & Cookie Authentication';
    let architecturePattern = 'Controller-Service-Model (MVC)';

    const fileMap = new Map<string, string>();
    files.forEach((f) => {
      fileMap.set(f.filePath.toLowerCase(), f.content);
      const ext = f.filePath.split('.').pop() || '';
      if (['ts', 'js', 'jsx', 'tsx'].includes(ext)) languages.add('TypeScript/JavaScript');
      if (['py'].includes(ext)) languages.add('Python');
      if (['java'].includes(ext)) languages.add('Java');
      if (['go'].includes(ext)) languages.add('Go');
    });

    const filePaths = files.map((f) => f.filePath);
    const packageJsonContent = fileMap.get('package.json') || fileMap.get('backend/package.json');
    if (packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent);
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (allDeps['next']) frameworks.push('Next.js');
        if (allDeps['react']) frameworks.push('React');
        if (allDeps['express']) frameworks.push('Express.js');
        if (allDeps['@nestjs/core']) frameworks.push('NestJS');
        if (allDeps['tailwindcss']) frameworks.push('Tailwind CSS');

        if (allDeps['prisma'] || allDeps['@prisma/client']) databases.push('PostgreSQL / SQLite (Prisma ORM)');
        if (allDeps['mongoose'] || allDeps['mongodb']) databases.push('MongoDB (Mongoose ORM)');
        if (allDeps['redis'] || allDeps['ioredis']) databases.push('Redis In-Memory Store');

        if (allDeps['jsonwebtoken'] || allDeps['passport'] || allDeps['jose']) authMethod = 'JWT (JSON Web Tokens) & Cookies';
        if (allDeps['express-session'] || allDeps['next-auth']) authMethod = 'Session Cookie Authentication';
      } catch (err) {}
    }

    const systemPrompt = `You are a Principal Software Architect. Your task is to write an executive, comprehensive Architecture Summary in Markdown based on the repository's file structure and dependencies. Do not output thinking tags or codeblocks. Output clean formatted markdown only.`;

    const userPrompt = `Repository Files (${files.length} total files):
${filePaths.slice(0, 45).join('\n')}

package.json Dependencies:
${packageJsonContent ? packageJsonContent.slice(0, 1500) : 'Standard Node.js / Express Application'}

Write a detailed, beautifully formatted Architecture Summary covering:
1. Executive Overview (Project purpose, stack overview, architectural pattern)
2. Structural Layering & Component Boundaries (Controllers, Services, Models, Routes, Utilities)
3. Data Flow & Security Model (Database interaction, authentication & session management)
4. System Scalability & Engineering Highlights`;

    let overviewMarkdown = '';
    try {
      const aiResponse = await llmService.generateCompletion(userPrompt, systemPrompt);
      const cleaned = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (cleaned && !cleaned.includes('Codebase Analysis Insight')) {
        overviewMarkdown = cleaned;
      }
    } catch (err) {}

    if (!overviewMarkdown) {
      overviewMarkdown = `
# Executive Architecture Summary

- **Project Type**: ${projectType}
- **Architecture Pattern**: ${architecturePattern}
- **Primary Languages**: ${Array.from(languages).join(', ') || 'TypeScript/JavaScript'}
- **Frameworks & Libraries**: ${frameworks.join(', ') || 'Express.js, React, Node.js'}
- **Databases & Cache**: ${databases.join(', ') || 'MongoDB, Redis'}
- **Authentication**: ${authMethod}

## Structural Overview
This repository follows a clean **${architecturePattern}** architecture design. Component separation ensures distinct boundary layers across HTTP routes, business controllers, database models, and helper utilities.
`;
    }

    const mainModules = [
      {
        name: 'API Routes & Endpoints',
        description: 'Exposes HTTP/REST endpoints for client interaction.',
        entryFiles: filePaths.filter((p) => p.includes('route') || p.includes('api')).slice(0, 5),
      },
      {
        name: 'Business Controllers',
        description: 'Encapsulates request processing, business validation, and data flows.',
        entryFiles: filePaths.filter((p) => p.includes('controller')).slice(0, 5),
      },
      {
        name: 'Data Models & Schemas',
        description: 'Database schemas and data persistence entities.',
        entryFiles: filePaths.filter((p) => p.includes('model') || p.includes('schema')).slice(0, 5),
      },
    ];

    return {
      repositoryId,
      projectType,
      architecturePattern,
      languages: Array.from(languages),
      frameworks,
      databases,
      authMethod,
      overviewMarkdown,
      mainModules,
    };
  }
}

export const architectureService = new ArchitectureService();
