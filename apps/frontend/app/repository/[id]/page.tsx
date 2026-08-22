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
            // 2. Files
            fetch(`${API_BASE_URL}/api/repositories/${id}/files`)
              .then((res) => res.json())
              .then((data) => {
                if (isSubscribed) {
                  setFiles(data);
                  if (data.length > 0 && !selectedFilePath) setSelectedFilePath(data[0].filePath);
                }
              })
              .catch(console.error);

            // 3. Architecture Graph
            fetch(`${API_BASE_URL}/api/repositories/${id}/graph`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setGraphData(data); })
              .catch(console.error);

            // 4. Architecture Summary
            fetch(`${API_BASE_URL}/api/repositories/${id}/architecture`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setArchitecture(data); })
              .catch(console.error);

            // 5. Health Report
            fetch(`${API_BASE_URL}/api/repositories/${id}/health`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setHealthReport(data); })
              .catch(console.error);

            // 6. API Docs
            fetch(`${API_BASE_URL}/api/repositories/${id}/docs`)
              .then((res) => res.json())
              .then((data) => { if (isSubscribed) setApiDocs(data); })
              .catch(console.error);

            // 7. Security Audit Report
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

  const handleRunImpact = async () => {
    if (!targetSymbolInput.trim() || impactLoading) return;
    setImpactLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbolName: targetSymbolInput }),
      });
      if (res.ok) setImpactResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleRunPlanner = async () => {
    if (!planGoalInput.trim() || plannerLoading) return;
    setPlannerLoading(true);
    setApplyMessage(null);
    setPrResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/plan-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: planGoalInput }),
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
                <span className="text-2xl font-bold text-indigo-400">{repo?.symbolCount || 0}</span>
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
                      +{branchDiff.addedSymbols.length} Symbols Added
                    </span>
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded">
                      -{branchDiff.deletedSymbols.length} Symbols Removed
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
                      {architecture.languages[0] || 'TypeScript'}
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
                    const blob = new Blob([JSON.stringify(apiDocs.openApiSpec, null, 2)], { type: 'application/json' });
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

              <p className="text-xs text-gray-300">{apiDocs.description}</p>
            </div>

            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                API Route Documentation
              </h3>
              <div className="prose prose-invert max-w-none text-xs text-gray-300 space-y-3 whitespace-pre-wrap leading-relaxed">
                {apiDocs.markdownDocs}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: IMPACT ANALYSIS */}
        {activeTab === 'impact' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                AI-Powered Code Impact Analysis
              </h2>
              <p className="text-xs text-gray-400">
                Simulate modifying a function or class to reveal all direct callers, downstream API routes, affected components, and potential breaking risks.
              </p>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={targetSymbolInput}
                  onChange={(e) => setTargetSymbolInput(e.target.value)}
                  placeholder="Enter function or symbol name (e.g., createUser, authService, login)"
                  className="flex-1 bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleRunImpact}
                  disabled={impactLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 transition-all"
                >
                  {impactLoading ? 'Analyzing Impact...' : 'Analyze Impact'}
                </button>
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
                    className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase border shadow-md ${
                      impactResult.riskLevel === 'HIGH' || impactResult.riskLevel === 'CRITICAL'
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
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-indigo-400" />
                  AI Automatic Source Code Editor & Refactor Engine
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                Describe any architectural change or refactoring goal in natural language. The AI will automatically rewrite source code files and save them directly to disk.
              </p>

              <div className="space-y-3">
                <textarea
                  value={planGoalInput}
                  onChange={(e) => setPlanGoalInput(e.target.value)}
                  placeholder="e.g., Replace JWT authentication in auth.ts with session cookie auth, add input validation to login endpoint, or add logging to error handlers"
                  rows={3}
                  className="w-full bg-darkBg border border-darkBorder rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleRunPlanner}
                    disabled={plannerLoading}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                  >
                    {plannerLoading ? 'Applying Code Changes Directly to Disk...' : 'Execute & Apply Code Edits Directly to Disk ⚡'}
                  </button>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthReport.metrics?.map((m, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{m.category}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        m.status === 'good'
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
          </div>
        )}

        {/* TAB 9: SECURITY AUDIT */}
        {activeTab === 'security' && securityReport && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Automated AI Vulnerability Scanner</span>
                  <h2 className="text-xl font-bold text-white mt-1">Security & Secret Exposure Audit</h2>
                </div>

                <div className="flex items-center gap-3 bg-darkBg px-5 py-3 rounded-2xl border border-darkBorder">
                  <span className="text-xs text-gray-400 font-semibold">Security Grade:</span>
                  <span className="text-3xl font-extrabold text-cyan-400">{securityReport.grade}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(securityReport.findings || securityReport.vulnerabilities || []).map((f) => (
                <div
                  key={f.id}
                  className="p-5 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <h3 className="text-sm font-bold text-white">{f.title}</h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        f.severity === 'CRITICAL' || f.severity === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : f.severity === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300">{f.description}</p>
                  <div className="p-3 rounded-xl bg-darkBg border border-darkBorder text-xs text-indigo-300 font-mono">
                    💡 Recommended Fix: {f.remediation}
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
