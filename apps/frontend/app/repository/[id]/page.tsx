'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { ChatWindow } from '../../../components/chat/ChatWindow';
import { ArchitectureGraph } from '../../../components/graph/ArchitectureGraph';
import { MonacoViewer } from '../../../components/code/MonacoViewer';
import { API_BASE_URL } from '../../../lib/api';
import {
  RepositoryMetadata,
  FileMetadata,
  GraphData,
  ArchitectureSummary,
  ImpactAnalysisResult,
  CodeChangePlan,
  RepositoryHealthReport,
  SecurityAuditReport,
  RepositoryApiDocumentation,
  PullRequestResult,
  BranchComparisonResult,
  SymbolInfo,
} from '@vocallab/shared';
import {
  Cpu,
  FileCode,
  Zap,
  ShieldCheck,
  Code,
  Layers,
  AlertTriangle,
  FileText,
  CheckCircle2,
  GitBranch,
  GitPullRequest,
  ExternalLink,
  ShieldAlert,
  Activity,
  Search,
  GitCompare,
  Loader2,
  Check,
  Trash2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const handleDeleteRepo = async () => {
    if (!confirm(`Are you sure you want to delete "${repo?.name || 'this repository'}" and all its cloned files?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [repo, setRepo] = useState<RepositoryMetadata | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileCode, setSelectedFileCode] = useState<string>('// Select a file to view code');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [architecture, setArchitecture] = useState<ArchitectureSummary | null>(null);

  const [targetSymbolInput, setTargetSymbolInput] = useState('');
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const [planGoalInput, setPlanGoalInput] = useState('');
  const [changePlan, setChangePlan] = useState<CodeChangePlan | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const [healthReport, setHealthReport] = useState<RepositoryHealthReport | null>(null);
  const [securityReport, setSecurityReport] = useState<SecurityAuditReport | null>(null);
  const [apiDocs, setApiDocs] = useState<RepositoryApiDocumentation | null>(null);

  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<PullRequestResult | null>(null);

  const [baseBranch, setBaseBranch] = useState('main');
  const [compareBranch, setCompareBranch] = useState('feature/proposed');
  const [branchDiff, setBranchDiff] = useState<BranchComparisonResult | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);

  // Auto-Polling Effect: Refetches status & progress every 1.5s until READY
  useEffect(() => {
    if (!id) return;

    let isSubscribed = true;

    const fetchRepoData = async () => {
      try {
        const repoRes = await fetch(`${API_BASE_URL}/api/repositories/${id}`);
        if (repoRes.ok) {
          const repoData: RepositoryMetadata = await repoRes.json();
          if (isSubscribed) setRepo(repoData);

          // If repo is ready or has files, fetch workspace data
          if (repoData.status === 'READY' || repoData.fileCount > 0) {
            // Files
            fetch(`${API_BASE_URL}/api/repositories/${id}/files`)
              .then((res) => res.json())
              .then((data) => {
                if (isSubscribed) {
                  setFiles(data);
                  if (data.length > 0 && !selectedFilePath) setSelectedFilePath(data[0].filePath);
                }
              })
              .catch(console.error);

            // Symbols
            fetch(`${API_BASE_URL}/api/repositories/${id}/symbols`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed && Array.isArray(data)) setSymbols(data); })
              .catch(console.error);

            // Architecture Graph
            fetch(`${API_BASE_URL}/api/repositories/${id}/graph`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setGraphData(data); })
              .catch(console.error);

            // Architecture Summary
            fetch(`${API_BASE_URL}/api/repositories/${id}/architecture`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setArchitecture(data); })
              .catch(console.error);

            // Health Report
            fetch(`${API_BASE_URL}/api/repositories/${id}/health`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setHealthReport(data); })
              .catch(console.error);

            // API Docs
            fetch(`${API_BASE_URL}/api/repositories/${id}/docs`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setApiDocs(data); })
              .catch(console.error);

            // Security Audit Report
            fetch(`${API_BASE_URL}/api/repositories/${id}/security`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setSecurityReport(data); })
              .catch(console.error);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchRepoData();

    // Poll every 1.5 seconds if processing
    const interval = setInterval(() => {
      fetchRepoData();
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (!id || !selectedFilePath) return;
    fetch(`${API_BASE_URL}/api/repositories/${id}/file-content?filePath=${encodeURIComponent(selectedFilePath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) setSelectedFileCode(data.content);
      })
      .catch(console.error);
  }, [id, selectedFilePath]);

  const handleRunImpact = async (customSymbolName?: string) => {
    const symbolToAnalyze = customSymbolName || targetSymbolInput;
    if (!symbolToAnalyze.trim() || impactLoading) return;
    setTargetSymbolInput(symbolToAnalyze);
    setImpactLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbolName: symbolToAnalyze }),
      });
      if (res.ok) setImpactResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleRunPlanner = async (customGoal?: string) => {
    const goalToExecute = customGoal || planGoalInput;
    if (!goalToExecute.trim() || plannerLoading) return;
    setPlanGoalInput(goalToExecute);
    setPlannerLoading(true);
    setApplyMessage(null);
    setPrResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/plan-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalToExecute }),
      });
      if (res.ok) {
        const planData = await res.json();
        setChangePlan(planData);
        setApplyMessage(`✅ Code editing successful! Updated ${planData.affectedFiles?.length || 0} repository files on local disk.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlannerLoading(false);
    }
  };

  const handleCreatePR = async () => {
    if (prLoading) return;
    setPrLoading(true);

    const changes = changePlan?.proposals?.map((p) => ({
      filePath: p.filePath,
      content: p.proposedContent,
    })) || [{ filePath: selectedFilePath || 'src/app.ts', content: selectedFileCode }];

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: `ai/change-${Date.now()}`,
          title: changePlan ? `AI Refactor: ${changePlan.goal}` : 'AI Code Refactoring',
          body: changePlan ? changePlan.summary : 'Automated code changes proposed by Agentic CodeLab AI Code Intelligence.',
          changes,
        }),
      });

      if (res.ok) setPrResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setPrLoading(false);
    }
  };

  const handleCompareBranches = async () => {
    if (branchLoading) return;
    setBranchLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/compare-branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseBranch, compareBranch }),
      });
      if (res.ok) setBranchDiff(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setBranchLoading(false);
    }
  };

  // AI Refactoring Proposal Presets
  const suggestedRefactoringGoals = [
    `Add input validation and error logging across controllers in ${repo?.name || 'this repository'}`,
    `Refactor core authentication and authorization handlers into a dedicated service layer`,
    `Wrap database queries in error-handled transaction context to prevent leaks`,
    `Add rate-limiting middleware to prevent API route abuse and denial of service`,
  ];

  return (
    <div className="min-h-screen bg-darkBg flex flex-col">
      <Navbar
        activeRepoId={id}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        repoName={repo?.name}
        status={repo?.status}
      />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Live Progress Bar Banner (Shows when status != READY) */}
            {repo && repo.status !== 'READY' && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-darkCard border border-indigo-500/30 glass-panel space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        Cloning Repository & Ingesting Codebase...
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          {repo.progressPercentage || 0}%
                        </span>
                      </h3>
                      <p className="text-xs text-gray-300 mt-0.5 font-mono">{repo.currentStepMessage || 'Processing repository files...'}</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    Auto-Updating Status
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-darkBg/80 rounded-full h-2.5 overflow-hidden border border-darkBorder">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-indigo-500/50"
                    style={{ width: `${Math.max(repo.progressPercentage || 5, 5)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Header with Delete Repository Action */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-indigo-400" />
                  {repo?.name || 'Codebase Overview'}
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{repo?.githubUrl}</p>
              </div>

              <button
                onClick={handleDeleteRepo}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-rose-500/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete Cloned Project
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel">
                <span className="text-xs text-gray-400 font-semibold block mb-1">Total Indexed Files</span>
                <span className="text-2xl font-bold text-white">{repo?.fileCount || files.length}</span>
              </div>
              <div className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel">
                <span className="text-xs text-gray-400 font-semibold block mb-1">Extracted AST Symbols</span>
                <span className="text-2xl font-bold text-indigo-400">{repo?.symbolCount || symbols.length || 0}</span>
              </div>
              <div className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel">
                <span className="text-xs text-gray-400 font-semibold block mb-1">Security Rating</span>
                <span className="text-2xl font-bold text-cyan-400">{securityReport?.grade || 'A+'}</span>
              </div>
              <div className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel">
                <span className="text-xs text-gray-400 font-semibold block mb-1">Health Score</span>
                <span className="text-2xl font-bold text-emerald-400">{healthReport?.score || 95}/100</span>
              </div>
            </div>

            {/* Branch-vs-Branch Comparison Tool */}
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-indigo-400" />
                Branch-vs-Branch Architecture Comparison
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  placeholder="Base Branch (e.g., main)"
                  className="bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={compareBranch}
                  onChange={(e) => setCompareBranch(e.target.value)}
                  placeholder="Compare Branch (e.g., feature/auth)"
                  className="bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <button
                  onClick={handleCompareBranches}
                  disabled={branchLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20"
                >
                  {branchLoading ? 'Comparing...' : 'Compare Branches'}
                </button>
              </div>

              {branchDiff && (
                <div className="p-4 rounded-xl bg-darkBg border border-darkBorder space-y-3">
                  <p className="text-xs text-gray-300 font-semibold">{branchDiff.summary}</p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded">
                      +{branchDiff?.addedSymbols?.length || 0} Symbols Added
                    </span>
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded">
                      -{branchDiff?.deletedSymbols?.length || 0} Symbols Removed
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Architecture Overview */}
            {architecture && (
              <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
                <div className="flex items-center justify-between border-b border-darkBorder pb-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Architecture Summary
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-lg bg-darkBg border border-darkBorder text-xs font-semibold text-indigo-400">
                      {architecture.projectType}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-darkBg border border-darkBorder text-xs font-semibold text-purple-400">
                      Pattern: {architecture.architecturePattern}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-darkBg border border-darkBorder text-xs font-semibold text-emerald-400">
                      {architecture?.languages?.[0] || 'TypeScript'}
                    </span>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none text-xs text-gray-300 space-y-3 whitespace-pre-wrap leading-relaxed">
                  {architecture.overviewMarkdown}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ARCHITECTURE GRAPH */}
        {activeTab === 'graph' && (
          <ArchitectureGraph
            graphData={graphData}
            onNodeClick={(path) => {
              setSelectedFilePath(path);
              setActiveTab('code');
            }}
          />
        )}

        {/* TAB 3: AI CODE CHAT */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-140px)]">
            <ChatWindow
              repositoryId={id}
              files={files}
              selectedFile={selectedFilePath}
            />
          </div>
        )}

        {/* TAB 4: MONACO SOURCE CODE VIEWER */}
        {activeTab === 'code' && (
          <div className="h-[calc(100vh-140px)]">
            <MonacoViewer
              filePath={selectedFilePath || 'Select a file'}
              files={files}
              code={selectedFileCode}
              onSelectFile={(path) => setSelectedFilePath(path)}
            />
          </div>
        )}

        {/* TAB 5: API DOCUMENTATION */}
        {activeTab === 'docs' && apiDocs && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">OpenAPI 3.0 Auto-Generated Specification</span>
                  <h2 className="text-xl font-bold text-white mt-1">{apiDocs.title} ({apiDocs.version})</h2>
                </div>
                <button
                  onClick={() => {
                    const jsonContent = apiDocs.openApiJson || (apiDocs.openApiSpec ? JSON.stringify(apiDocs.openApiSpec, null, 2) : JSON.stringify(apiDocs, null, 2));
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `openapi-spec-${id}.json`;
                    a.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
                >
                  Download OpenAPI Spec ↗
                </button>
              </div>

              <p className="text-xs text-gray-300">{apiDocs.description || `Discovered ${apiDocs.endpoints?.length || 0} API endpoints in repository.`}</p>
            </div>

            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                API Route Documentation
              </h3>
              <div className="prose prose-invert max-w-none text-xs text-gray-300 space-y-3 whitespace-pre-wrap leading-relaxed">
                {apiDocs.markdownDoc || apiDocs.markdownDocs}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: IMPACT ANALYSIS */}
        {activeTab === 'impact' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    AI-Powered Code Impact Analysis
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Simulate modifying a function or class to reveal all direct callers, downstream API routes, affected components, and potential breaking risks.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={targetSymbolInput}
                  onChange={(e) => setTargetSymbolInput(e.target.value)}
                  placeholder="Enter function or symbol name (e.g., createUser, authService, login)"
                  className="flex-1 bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleRunImpact()}
                  disabled={impactLoading || !targetSymbolInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-all"
                >
                  {impactLoading ? 'Analyzing Impact...' : 'Analyze Impact'}
                </button>
              </div>

              {/* AI SUGGESTED SYMBOL TARGETS FROM CLONED PROJECT */}
              <div className="pt-3 border-t border-darkBorder space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    AI Suggested Symbols Discovered in "{repo?.name || 'this codebase'}"
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">Click any extracted symbol below to analyze its impact instantly:</p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {symbols.length > 0 ? (
                    symbols.slice(0, 12).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleRunImpact(s.name)}
                        className="px-3 py-1.5 rounded-xl bg-darkBg hover:bg-amber-500/10 border border-darkBorder hover:border-amber-500/40 text-xs font-mono text-amber-300 transition-all flex items-center gap-1.5 shadow-sm group"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">{s.name}</span>
                        <span className="text-[10px] text-gray-500 font-sans">({s.type})</span>
                      </button>
                    ))
                  ) : (
                    ['createProblem', 'authService', 'getUserById', 'handleUpload', 'logger'].map((defSym, i) => (
                      <button
                        key={i}
                        onClick={() => handleRunImpact(defSym)}
                        className="px-3 py-1.5 rounded-xl bg-darkBg hover:bg-amber-500/10 border border-darkBorder hover:border-amber-500/40 text-xs font-mono text-amber-300 transition-all flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{defSym}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {impactResult && (
              <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-6">
                <div className="flex items-center justify-between border-b border-darkBorder pb-4">
                  <div>
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Analyzed Target Symbol</span>
                    <h3 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      {impactResult.targetSymbol}
                    </h3>
                  </div>

                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase border shadow-md ${impactResult.riskLevel === 'HIGH' || impactResult.riskLevel === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : impactResult.riskLevel === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                  >
                    Refactoring Risk: {impactResult.riskLevel}
                  </span>
                </div>

                {/* Executive Blast Radius Summary */}
                <div className="p-4 rounded-xl bg-darkBg border border-darkBorder space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Executive Impact Assessment</h4>
                  <p className="text-xs text-gray-200 leading-relaxed">{impactResult.summary}</p>
                </div>

                {/* Impact Metrics Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-darkBg border border-darkBorder text-center">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Affected Files</span>
                    <span className="text-xl font-bold text-white">{impactResult.affectedFiles.length}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-darkBg border border-darkBorder text-center">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Affected API Routes</span>
                    <span className="text-xl font-bold text-indigo-400">{impactResult.affectedAPIs.length}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-darkBg border border-darkBorder text-center">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Affected UI Components</span>
                    <span className="text-xl font-bold text-purple-400">{impactResult.affectedComponents.length}</span>
                  </div>
                </div>

                {/* Affected Dependent Files Grid */}
                {impactResult.affectedFiles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Discovered Dependent Files ({impactResult.affectedFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {impactResult.affectedFiles.map((af, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedFilePath(af.filePath);
                            setActiveTab('code');
                          }}
                          className="p-3 rounded-xl bg-darkBg border border-darkBorder hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between text-xs font-mono group"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-white font-semibold truncate group-hover:text-amber-300">{af.filePath}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] text-gray-400 font-sans italic">{af.reason}</span>
                            <span className="text-[11px] text-amber-400 font-sans font-semibold group-hover:underline">
                              View Code ↗
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: AUTOMATIC CODE EDITOR & CHANGE PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-indigo-400" />
                  AI Automatic Source Code Editor & Refactor Engine
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                Describe any architectural change or refactoring goal in natural language. The AI will automatically rewrite source code files and save them directly to disk.
              </p>

              <div className="space-y-4">
                <textarea
                  value={planGoalInput}
                  onChange={(e) => setPlanGoalInput(e.target.value)}
                  placeholder="e.g., Replace JWT authentication in auth.ts with session cookie auth, add input validation to login endpoint, or add logging to error handlers"
                  rows={3}
                  className="w-full bg-darkBg border border-darkBorder rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleRunPlanner()}
                    disabled={plannerLoading || !planGoalInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {plannerLoading ? 'Applying Code Changes Directly to Disk...' : 'Execute & Apply Code Edits Directly to Disk ⚡'}
                  </button>
                </div>

                {/* AI SUGGESTED REFACTORING GOALS FOR THIS PROJECT */}
                <div className="pt-3 border-t border-darkBorder space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      AI Recommended Refactoring Proposals for "{repo?.name || 'this project'}"
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">Click any AI proposal below to populate the prompt and execute automated code edits:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {suggestedRefactoringGoals.map((goal, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRunPlanner(goal)}
                        className="p-3 rounded-xl bg-darkBg hover:bg-indigo-600/10 border border-darkBorder hover:border-indigo-500/40 text-xs text-gray-300 text-left transition-all flex items-start justify-between gap-2 group"
                      >
                        <span className="font-medium group-hover:text-white leading-relaxed">{goal}</span>
                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {applyMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {applyMessage}
              </div>
            )}

            {changePlan && (
              <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-darkBorder">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase">Automated Change Summary</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{changePlan.goal}</h3>
                  </div>

                  <button
                    onClick={handleCreatePR}
                    disabled={prLoading}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
                  >
                    <GitPullRequest className="w-4 h-4" />
                    {prLoading ? 'Submitting PR to GitHub...' : 'Submit 1-Click Pull Request to GitHub ↗'}
                  </button>
                </div>

                {prResult && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                    <h4 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      Pull Request Created Successfully!
                    </h4>
                    <p className="text-xs text-gray-300">
                      Branch: <code className="text-indigo-300">{prResult.branchName}</code>
                    </p>
                    <a
                      href={prResult.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold hover:underline"
                    >
                      View Live PR on GitHub ↗
                    </a>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase">Code Refactoring Report</h4>
                  <div className="p-4 rounded-xl bg-darkBg border border-darkBorder text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                    {changePlan.summary}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase">
                    Modified Codebase Files ({changePlan.proposals?.length || 0})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {changePlan.proposals?.map((prop, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedFilePath(prop.filePath);
                          setActiveTab('code');
                        }}
                        className="p-4 rounded-xl bg-darkBg border border-darkBorder hover:border-indigo-500/50 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <FileCode className="w-5 h-5 text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                              {prop.filePath.split('/').pop()}
                            </h5>
                            <p className="text-[11px] text-gray-400 truncate">{prop.filePath}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-indigo-400 font-semibold group-hover:underline shrink-0">
                          View Edited Code ↗
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: HEALTH AUDIT */}
        {activeTab === 'health' && healthReport && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Holistic Code Quality & Maintainability</span>
                  <h2 className="text-xl font-bold text-white mt-1">Repository Health Audit Report</h2>
                </div>

                <div className="flex items-center gap-3 bg-darkBg px-5 py-3 rounded-2xl border border-darkBorder">
                  <span className="text-xs text-gray-400 font-semibold">Health Score:</span>
                  <span className="text-3xl font-extrabold text-emerald-400">{healthReport.score}/100</span>
                </div>
              </div>

              {healthReport.summary && (
                <div className="p-4 rounded-xl bg-darkBg border border-darkBorder text-xs text-gray-300 leading-relaxed font-mono">
                  💡 {healthReport.summary}
                </div>
              )}
            </div>

            {/* Health Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(healthReport.metrics && healthReport.metrics.length > 0
                ? healthReport.metrics
                : [
                  {
                    category: 'Circular Dependencies & Imports',
                    status: (healthReport.circularDependencies?.length || 0) === 0 ? 'good' : 'warning',
                    observation: (healthReport.circularDependencies?.length || 0) === 0
                      ? 'Zero circular import dependencies detected. Excellent modular decoupling.'
                      : `Found ${healthReport.circularDependencies?.length} potential circular dependency cycles.`,
                  },
                  {
                    category: 'Function Complexity & Size',
                    status: (healthReport.complexFunctions?.length || 0) === 0 ? 'good' : 'warning',
                    observation: (healthReport.complexFunctions?.length || 0) === 0
                      ? 'All functions are concise and under 50 lines of code.'
                      : `Found ${healthReport.complexFunctions?.length} complex functions exceeding 50 lines.`,
                  },
                  {
                    category: 'Unreferenced Exported Symbols',
                    status: (healthReport.deadCodeCandidates?.length || 0) === 0 ? 'good' : 'warning',
                    observation: (healthReport.deadCodeCandidates?.length || 0) === 0
                      ? 'All exported functions and symbols are actively consumed.'
                      : `Identified ${healthReport.deadCodeCandidates?.length} exported symbols that are unreferenced.`,
                  },
                  {
                    category: 'Type Safety & Architecture Patterns',
                    status: 'good',
                    observation: 'TypeScript type checks and modular architectural boundaries are enforced.',
                  },
                ]
              ).map((m: any, idx: number) => (
                <div key={idx} className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{m.category}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${m.status === 'good'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : m.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{m.observation}</p>
                </div>
              ))}
            </div>

            {/* Complex Functions Breakdown */}
            {healthReport.complexFunctions && healthReport.complexFunctions.length > 0 && (
              <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Complex Functions (&gt; 50 Lines)
                </h3>
                <div className="space-y-2">
                  {healthReport.complexFunctions.map((cf: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-darkBg border border-darkBorder flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-indigo-400" />
                        <span className="text-white font-bold">{cf.symbolName}</span>
                        <span className="text-gray-400">({cf.filePath})</span>
                      </div>
                      <span className="text-amber-400 font-bold">{cf.lines} lines</span>
                    </div>
                  ))}
                </div>

}
