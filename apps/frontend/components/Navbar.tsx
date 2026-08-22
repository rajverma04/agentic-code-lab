'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, GitBranch, MessageSquare, Network, ShieldCheck, Zap, Code, FileText, Lock } from 'lucide-react';

interface NavbarProps {
  activeRepoId?: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  repoName?: string;
  status?: string;
}

export function Navbar({ activeRepoId, activeTab = 'overview', setActiveTab, repoName, status }: NavbarProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Cpu },
    { id: 'graph', label: 'Architecture Graph', icon: Network },
    { id: 'chat', label: 'AI Code Chat', icon: MessageSquare },
    { id: 'docs', label: 'API Docs', icon: FileText },
    { id: 'impact', label: 'Impact Analysis', icon: Zap },
    { id: 'planner', label: 'Change Planner', icon: Code },
    { id: 'health', label: 'Health Audit', icon: ShieldCheck },
    { id: 'security', label: 'Security Audit', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-darkBorder bg-darkBg/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Agentic CodeLab
            </span>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-indigo-400 block -mt-1">
              AI Code Intelligence
            </span>
          </div>
        </Link>

        {repoName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-darkCard border border-darkBorder text-xs text-gray-300">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-white">{repoName}</span>
            {status && (
              <span
                className={`ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                  status === 'READY'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                }`}
              >
                {status}
              </span>
            )}
          </div>
        )}
      </div>

      {activeRepoId && setActiveTab && (
        <nav className="flex items-center gap-1 bg-darkCard/80 p-1 rounded-xl border border-darkBorder">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
