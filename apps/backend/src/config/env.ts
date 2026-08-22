import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || '4000',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || process.env.QWEN_API || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  REPOS_DIR: path.resolve(process.cwd(), process.env.REPOS_DIR || './temp_repos'),
};
