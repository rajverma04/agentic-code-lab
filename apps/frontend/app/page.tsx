'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Github, ArrowRight, CheckCircle2, Clock, AlertCircle, Sparkles, Code2, Network, ShieldCheck } from 'lucide-react';
import { RepositoryMetadata } from '@vocallab/shared';
import { Navbar } from '../components/Navbar';
import { API_BASE_URL } from '../lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<RepositoryMetadata[]>([]);

  const fetchRepositories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories`);
      if (res.ok) {
        const data = await res.json();
        setRepositories(data);
      }
    } catch (err) {
      console.warn('Backend server not responding yet');
    }
  };

  useEffect(() => {
    fetchRepositories();
    const interval = setInterval(fetchRepositories, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl }),
      });

      if (res.ok) {
        const repo: RepositoryMetadata = await res.json();
        setGithubUrl('');
        router.push(`/repository/${repo.id}`);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit repository');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Native Codebase Analyzer & Developer Assistant</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-center tracking-tight max-w-4xl leading-[1.15] mb-6">
          Understand Any GitHub Codebase{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            In Seconds
          </span>
        </h1>

        <p className="text-gray-400 text-center max-w-2xl text-base sm:text-lg mb-10 leading-relaxed">
          Deep AST code parsing, automatic dependency graph extraction, semantic vector chunking, and RAG reasoning for any public GitHub repository.
        </p>

        {/* GitHub Ingestion Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-12">
          <div className="flex flex-col sm:flex-row items-center gap-3 p-2 rounded-2xl bg-darkCard border border-darkBorder glass-panel shadow-2xl">
            <div className="flex items-center gap-3 px-4 flex-1 w-full">
              <Github className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                required
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-2"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
            >
              {loading ? (
                <span>Cloning & Analyzing...</span>
              ) : (
                <>
                  <span>Analyze Repository</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Features Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          <div className="p-6 rounded-2xl bg-darkCard/60 border border-darkBorder glass-panel">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-1 text-base">AST Structural Analysis</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              ts-morph & language parsers extract functions, classes, signatures, imports, and exports rather than plain text.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-darkCard/60 border border-darkBorder glass-panel">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-1 text-base">Visual Dependency Graph</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Interactive React Flow explorer visualizing caller-callee graphs and layered architectural boundaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-darkCard/60 border border-darkBorder glass-panel">
            <div className="w-10 h-10 rounded-xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-1 text-base">Impact Analysis & Health Audit</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Simulate code modifications to reveal affected APIs, database tables, and risk scores before writing code.
            </p>
          </div>
        </div>

        {/* Ingested Repositories List */}
        {repositories.length > 0 && (
          <div className="w-full max-w-4xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Recent Analyzed Repositories
            </h2>

            <div className="space-y-3">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => router.push(`/repository/${repo.id}`)}
                  className="p-5 rounded-2xl bg-darkCard border border-darkBorder hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {repo.name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">({repo.owner})</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{repo.description || repo.githubUrl}</p>

                    {/* Progress Bar if processing */}
                    {repo.status !== 'READY' && repo.status !== 'FAILED' && (
                      <div className="mt-3 w-full max-w-md">
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1 font-mono">
                          <span>{repo.currentStepMessage || repo.status}</span>
                          <span>{repo.progressPercentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-darkBg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${repo.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    {repo.status === 'READY' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        READY
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        {repo.status}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
