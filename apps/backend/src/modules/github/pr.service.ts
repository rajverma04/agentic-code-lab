import { Octokit } from '@octokit/rest';
import { env } from '../../config/env';
import { githubService } from './github.service';
import { PullRequestResult } from '@vocallab/shared';

export interface CreatePrInput {
  githubUrl: string;
  branchName: string;
  title: string;
  body: string;
  changes: { filePath: string; content: string }[];
}

export class PrService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN || undefined,
    });
  }

  public async createPullRequest(input: CreatePrInput): Promise<PullRequestResult> {
    const { githubUrl, branchName, title, body, changes } = input;
    const parsed = githubService.parseUrl(githubUrl);

    if (!env.GITHUB_TOKEN) {
      // Unauthenticated sandbox simulation fallback
      return {
        success: true,
        branchName,
        prUrl: `${githubUrl}/pull/new/${branchName}`,
        message: `[Sandbox PR Mode] Proposed branch "${branchName}" and ${changes.length} file changes generated. Configure GITHUB_TOKEN in .env to open live PRs on GitHub.`,
      };
    }

    try {
      // 1. Get default branch SHA
      const repoRef = await this.octokit.rest.repos.get({ owner: parsed.owner, repo: parsed.repo });
      const defaultBranch = repoRef.data.default_branch || 'main';

      const masterRef = await this.octokit.rest.git.getRef({
        owner: parsed.owner,
        repo: parsed.repo,
        ref: `heads/${defaultBranch}`,
      });
      const baseSha = masterRef.data.object.sha;

      // 2. Create new branch ref
      await this.octokit.rest.git.createRef({
        owner: parsed.owner,
        repo: parsed.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      // 3. Create tree blobs & commit
      const treeItems = [];
      for (const change of changes) {
        const blob = await this.octokit.rest.git.createBlob({
          owner: parsed.owner,
          repo: parsed.repo,
          content: Buffer.from(change.content).toString('base64'),
          encoding: 'base64',
        });

        treeItems.push({
          path: change.filePath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.data.sha,
        });
      }

      const tree = await this.octokit.rest.git.createTree({
        owner: parsed.owner,
        repo: parsed.repo,
        base_tree: baseSha,
        tree: treeItems,
      });

      const commit = await this.octokit.rest.git.createCommit({
        owner: parsed.owner,
        repo: parsed.repo,
        message: `${title}\n\n${body}`,
        tree: tree.data.sha,
        parents: [baseSha],
      });

      await this.octokit.rest.git.updateRef({
        owner: parsed.owner,
        repo: parsed.repo,
        ref: `heads/${branchName}`,
        sha: commit.data.sha,
      });

      // 4. Create Pull Request
      const pr = await this.octokit.rest.pulls.create({
        owner: parsed.owner,
        repo: parsed.repo,
        title,
        body,
        head: branchName,
        base: defaultBranch,
      });

      return {
        success: true,
        prUrl: pr.data.html_url,
        prNumber: pr.data.number,
        branchName,
        message: `Successfully created GitHub Pull Request #${pr.data.number}`,
      };
    } catch (err: any) {
      return {
        success: false,
        branchName,
        message: `Failed to create Pull Request on GitHub: ${err.message}`,
      };
    }
  }
}

export const prService = new PrService();
