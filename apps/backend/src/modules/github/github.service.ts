import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import { env } from '../../config/env';

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  cleanUrl: string;
}

export class GithubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN || undefined,
    });
  }

  public parseUrl(githubUrl: string): ParsedGithubUrl {
    const trimmed = githubUrl.trim().replace(/\.git$/, '');
    const match = trimmed.match(/github\.com\/([^\/]+)\/([^\/]+)/i);

    if (!match) {
      throw new Error(`Invalid GitHub URL format: "${githubUrl}". Expected format: https://github.com/owner/repository`);
    }

    const owner = match[1];
    const repo = match[2];

    return {
      owner,
      repo,
      cleanUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  public async getRepoMetadata(owner: string, repo: string) {
    try {
      const res = await this.octokit.rest.repos.get({ owner, repo });
      return {
        name: res.data.name,
        owner: res.data.owner.login,
        defaultBranch: res.data.default_branch || 'main',
        stars: res.data.stargazers_count,
        description: res.data.description || '',
      };
    } catch (err: any) {
      console.warn(`[GithubService] Could not fetch GitHub API metadata for ${owner}/${repo}: ${err.message}. Using defaults.`);
      return {
        name: repo,
        owner: owner,
        defaultBranch: 'main',
        stars: 0,
        description: `GitHub repository ${owner}/${repo}`,
      };
    }
  }

  public async cloneRepository(githubUrl: string, targetPath: string): Promise<string> {
    const parsed = this.parseUrl(githubUrl);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const git = simpleGit();
    console.log(`[GithubService] Cloning ${parsed.cleanUrl} into ${targetPath}...`);
    
    try {
      await git.clone(parsed.cleanUrl, targetPath, ['--depth', '1']);
      console.log(`[GithubService] Successfully cloned ${parsed.cleanUrl}`);
      return targetPath;
    } catch (err: any) {
      console.error(`[GithubService] Git clone failed: ${err.message}`);
      throw new Error(`Failed to clone repository from ${githubUrl}: ${err.message}`);
    }
  }
}

export const githubService = new GithubService();
