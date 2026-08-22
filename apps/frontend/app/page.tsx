'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Github, ArrowRight, CheckCircle2, Clock, AlertCircle, Sparkles, Code2, Network, ShieldCheck, Trash2 } from 'lucide-react';
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
        const data = await res.json();
        setError(data.error || 'Failed to submit repository');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepo = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents navigating to workspace
    if (!confirm(`Are you sure you want to delete "${name}" and all its cloned files?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRepositories((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full text-center space-y-12">
        {/* HERO HEADER */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous Agentic Code Base Analysis
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Understand Any GitHub Codebase <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">In Seconds</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Deep AST code parsing, automatic dependency graph extraction, semantic vector chunking, and RAG reasoning for any public GitHub repository.
          </p>
        </div>

        {/* INPUT FORM */}
        <div className="w-full max-w-2xl space-y-3">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-4 text-gray-500">
              <Github className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full bg-darkCard/90 border border-darkBorder rounded-2xl py-4 pl-12 pr-44 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xl transition-all"
            />
            <button
              type="submit"
              disabled={loading || !githubUrl.trim()}
              className="absolute right-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>Cloning & Ingesting...</span>
              ) : (
                <>
                  <span>Analyze Repository</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          <div className="p-6 rounded-2xl bg-darkCard/60 border border-darkBorder glass-panel hover:border-indigo-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-1 text-base">AST Structural Analysis</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              ts-morph & language parsers extract functions, classes, signatures, imports, and exports rather than plain text.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-darkCard/60 border border-darkBorder glass-panel hover:border-indigo-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-1 text-base">Visual Dependency Graph</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Interactive React Flow explorer visualizing caller-callee graphs and layered architectural boundaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-darkCard/60 border border-darkBorder glass-panel hover:border-indigo-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-1 text-base">Impact Analysis & Health Audit</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Simulate code modifications to reveal affected APIs, database tables, and risk scores before writing code.
            </p>
          </div>
        </div>

        {/* INGESTED REPOSITORIES LIST WITH DELETE BUTTON */}
        {repositories.length > 0 && (
          <div className="w-full max-w-4xl text-left">
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

                  <div className="flex items-center gap-3 text-xs shrink-0">
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

                    {/* Delete Cloned Repository Button */}
                    <button
                      onClick={(e) => handleDeleteRepo(repo.id, repo.name, e)}
                      title="Delete cloned project"
                      className="p-2 rounded-xl bg-darkBg hover:bg-rose-500/20 border border-darkBorder hover:border-rose-500/40 text-gray-400 hover:text-rose-400 transition-all z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

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
