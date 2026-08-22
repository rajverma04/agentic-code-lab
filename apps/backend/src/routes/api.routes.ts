import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { env } from '../config/env';
import { prisma } from '../database/db';
import { githubService } from '../modules/github/github.service';
import { repositoryProcessor } from '../modules/repository/repository.processor';
import { ragService } from '../modules/rag/rag.service';
import { impactService } from '../modules/analysis/impact.service';
import { changePlannerService } from '../modules/agent/change.planner';
import { healthService } from '../modules/health/health.service';
import { graphService } from '../modules/graph/graph.service';
import { documentationService } from '../modules/documentation/documentation.service';
import { securityService } from '../modules/security/security.service';
import { branchService } from '../modules/analysis/branch.service';
import { architectureService } from '../modules/analysis/architecture.service';
import { prService } from '../modules/github/pr.service';

const router = Router();

// 1. Submit GitHub URL for processing
router.post('/repositories', async (req, res) => {
  try {
    const { githubUrl } = req.body;
    if (!githubUrl) return res.status(400).json({ error: 'githubUrl is required' });

    const parsed = githubService.parseUrl(githubUrl);
    const meta = await githubService.getRepoMetadata(parsed.owner, parsed.repo);

    const repository = await prisma.repository.create({
      data: {
        githubUrl: parsed.cleanUrl,
        name: meta.name,
        owner: meta.owner,
        defaultBranch: meta.defaultBranch,
        stars: meta.stars,
        description: meta.description,
        status: 'PENDING',
        progressPercentage: 5,
        currentStepMessage: 'Submission received. Starting processing pipeline...',
      },
    });

    // Trigger async processing pipeline background task
    repositoryProcessor.processRepository(repository.id).catch((err) => {
      console.error(`Async background processing failed for repo ${repository.id}:`, err);
    });

    return res.status(201).json(repository);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get all repositories
router.get('/repositories', async (_req, res) => {
  try {
    const repos = await prisma.repository.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(repos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Get single repository status & metadata
router.get('/repositories/:id', async (req, res) => {
  try {
    const repo = await prisma.repository.findUnique({
      where: { id: req.params.id },
    });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    return res.json(repo);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Get file tree for repository
router.get('/repositories/:id/files', async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      where: { repositoryId: req.params.id },
      select: {
        id: true,
        filePath: true,
        language: true,
        sizeBytes: true,
        lineCount: true,
        type: true,
      },
    });
    return res.json(files);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4b. Get raw file content
router.get('/repositories/:id/file-content', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'filePath query param is required' });
    }

    const repoDir = path.join(env.REPOS_DIR, req.params.id);
    const fullPath = path.join(repoDir, filePath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return res.json({ filePath, content });
    }

    return res.status(404).json({ error: 'File not found on disk' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Get visual dependency graph data (for React Flow)
router.get('/repositories/:id/graph', async (req, res) => {
  try {
    const repositoryId = req.params.id;
    const files = await prisma.file.findMany({ where: { repositoryId } });
    const symbols = await prisma.symbol.findMany({ where: { repositoryId } });

    const fileImportsMap = new Map<string, string[]>();
    symbols.forEach((s) => {
      try {
        const imp = JSON.parse(s.importsJson || '[]');
        const existing = fileImportsMap.get(s.filePath) || [];
        fileImportsMap.set(s.filePath, Array.from(new Set([...existing, ...imp])));
      } catch (err) {}
    });

    // Fallback: Extract require(...) and import statements directly from disk content
    const repoDir = path.join(env.REPOS_DIR, repositoryId);
    for (const f of files) {
      const existing = fileImportsMap.get(f.filePath) || [];
      const fullPath = path.join(repoDir, f.filePath);

      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const detected: string[] = [...existing];

          const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
          for (const match of requireMatches) {
            if (match[1]) detected.push(match[1]);
          }

          const importMatches = content.matchAll(/from\s*['"]([^'"]+)['"]/g);
          for (const match of importMatches) {
            if (match[1]) detected.push(match[1]);
          }

          fileImportsMap.set(f.filePath, Array.from(new Set(detected)));
        } catch (e) {}
      }
    }

    const graph = graphService.buildDependencyGraph(
      files.map((f) => ({
        filePath: f.filePath,
        language: f.language,
        imports: fileImportsMap.get(f.filePath) || [],
      })),
      symbols.map((s) => ({
        id: s.id,
        filePath: s.filePath,
        name: s.name,
        type: s.type,
        calls: JSON.parse(s.callsJson || '[]'),
      }))
    );

    return res.json(graph);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Get Architecture Overview (Powered by Qwen AI)
router.get('/repositories/:id/architecture', async (req, res) => {
  try {
    const repositoryId = req.params.id;
    let result = await prisma.analysisResult.findFirst({
      where: { repositoryId, analysisType: 'architecture' },
    });

    let archData: any = null;
    if (result) {
      try {
        archData = JSON.parse(result.resultJson);
      } catch (e) {}
    }

    // Regenerate using Qwen AI if missing or using static fallback summary
    if (!archData || !archData.overviewMarkdown || archData.overviewMarkdown.includes('- **Project Type**: Web Application\n- **Architecture Pattern**: Modular Monolith')) {
      const files = await prisma.file.findMany({ where: { repositoryId }, take: 45 });
      const repoDir = path.join(env.REPOS_DIR, repositoryId);

      const fileInputs = files.map((f) => {
        let content = '';
        const fullPath = path.join(repoDir, f.filePath);
        if (fs.existsSync(fullPath)) {
          try {
            content = fs.readFileSync(fullPath, 'utf-8');
          } catch (e) {}
        }
        return { filePath: f.filePath, content };
      });

      archData = await architectureService.analyzeArchitecture(repositoryId, fileInputs);

      if (result) {
        await prisma.analysisResult.update({
          where: { id: result.id },
          data: { resultJson: JSON.stringify(archData) },
        });
      } else {
        await prisma.analysisResult.create({
          data: { repositoryId, analysisType: 'architecture', resultJson: JSON.stringify(archData) },
        });
      }
    }

    return res.json(archData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Get Repository Health Report
router.get('/repositories/:id/health', async (req, res) => {
  try {
    const report = await healthService.generateHealthReport(req.params.id);
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Impact Analysis
router.post('/repositories/:id/impact', async (req, res) => {
  try {
    const { symbolName } = req.body;
    if (!symbolName) return res.status(400).json({ error: 'symbolName is required' });

    const result = await impactService.analyzeImpact(req.params.id, symbolName);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. AI Change Plan
router.post('/repositories/:id/plan-change', async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });

    const plan = await changePlannerService.createChangePlan(req.params.id, goal);
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Side-by-Side Git Diff Proposal
router.post('/repositories/:id/diff-proposal', async (req, res) => {
  try {
    const { filePath, instruction } = req.body;
    if (!filePath || !instruction) return res.status(400).json({ error: 'filePath and instruction are required' });

    const diff = await changePlannerService.generateDiffProposal(req.params.id, filePath, instruction);
    return res.json(diff);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. AI Codebase RAG Chat API
router.post('/chat', async (req, res) => {
  try {
    const { repositoryId, question, selectedFilePath } = req.body;
    if (!repositoryId || !question) return res.status(400).json({ error: 'repositoryId and question are required' });

    // Create or get active Chat session
    let chat = await prisma.chat.findFirst({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: { repositoryId, title: 'Codebase Conversation' },
      });
    }

    // Record User Message
    await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'user',
        content: question,
      },
    });

    // Execute RAG Engine
    const assistantMessage = await ragService.answerQuestion({
      repositoryId,
      chatId: chat.id,
      question,
      selectedFilePath,
    });

    return res.json({ chatId: chat.id, message: assistantMessage });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 12. Get Chat Messages
router.get('/chat/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { chatId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    const parsedMessages = messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      sender: m.sender,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      sources: JSON.parse(m.sourcesJson || '[]'),
      codeFlow: JSON.parse(m.flowJson || '[]'),
    }));

    return res.json(parsedMessages);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 13. Auto-generated API Documentation & OpenAPI 3.0 Spec
router.get('/repositories/:id/docs', async (req, res) => {
  try {
    const docs = await documentationService.generateDocumentation(req.params.id);
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 14. AI Security Audit & Vulnerability Scanner
router.get('/repositories/:id/security', async (req, res) => {
  try {
    const audit = await securityService.auditRepository(req.params.id);
    return res.json(audit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 15. Branch-vs-Branch Architecture Comparison
router.post('/repositories/:id/compare-branches', async (req, res) => {
  try {
    const { baseBranch, compareBranch } = req.body;
    const comparison = await branchService.compareBranches(
      req.params.id,
      baseBranch || 'main',
      compareBranch || 'feature/proposed'
    );
    return res.json(comparison);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 16. One-Click GitHub Pull Request Creation
router.post('/repositories/:id/create-pr', async (req, res) => {
  try {
    const repo = await prisma.repository.findUnique({ where: { id: req.params.id } });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const { branchName, title, body, changes } = req.body;
    const result = await prService.createPullRequest({
      githubUrl: repo.githubUrl,
      branchName: branchName || `ai/change-${Date.now()}`,
      title: title || 'AI Automated Refactoring Plan',
      body: body || 'Automated code changes generated by vocallab AI Code Intelligence.',
      changes: changes || [],
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 17. Apply AI Proposed Changes directly to local repository disk
router.post('/repositories/:id/apply-changes', async (req, res) => {
  try {
    const { proposals } = req.body;
    if (!proposals || !Array.isArray(proposals)) {
      return res.status(400).json({ error: 'proposals array is required' });
    }

    const result = await changePlannerService.applyChangesToDisk(req.params.id, proposals);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 18. Delete a repository and cleanup disk files
router.delete('/repositories/:id', async (req, res) => {
  try {
    const repositoryId = req.params.id;

    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    // Delete directory from disk if exists
    const repoDir = path.join(env.REPOS_DIR, repositoryId);
    if (fs.existsSync(repoDir)) {
      try {
        fs.rmSync(repoDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Could not delete directory ${repoDir}:`, err);
      }
    }

    // Delete record from Prisma (Cascades delete to files, symbols, chunks, dependencies, chats, etc.)
    await prisma.repository.delete({ where: { id: repositoryId } });

    return res.json({ success: true, message: 'Repository deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
