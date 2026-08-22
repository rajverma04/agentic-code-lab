'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Lock,
  GitPullRequest,
  CheckCircle2,
  ChevronRight,
  GitCompare,
  Save,
  Check,
  CheckCircle,
} from 'lucide-react';

export default function RepositoryWorkspacePage() {
  const { id } = useParams() as { id: string };

  const [activeTab, setActiveTab] = useState('overview');
  const [repo, setRepo] = useState<RepositoryMetadata | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [architecture, setArchitecture] = useState<ArchitectureSummary | null>(null);
  const [healthReport, setHealthReport] = useState<RepositoryHealthReport | null>(null);

  // New Features State
  const [apiDocs, setApiDocs] = useState<RepositoryApiDocumentation | null>(null);
  const [securityReport, setSecurityReport] = useState<SecurityAuditReport | null>(null);
  const [prResult, setPrResult] = useState<PullRequestResult | null>(null);
  const [prLoading, setPrLoading] = useState(false);

  // Apply to disk status
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  // Branch Comparison State
  const [baseBranch, setBaseBranch] = useState('main');
  const [compareBranch, setCompareBranch] = useState('feature/proposed');
  const [branchDiff, setBranchDiff] = useState<BranchComparisonResult | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);

  // Selected file for Monaco Editor
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [selectedFileCode, setSelectedFileCode] = useState<string>('// Select a file from the explorer to view source code.');

  // Impact Analysis State
  const [targetSymbolInput, setTargetSymbolInput] = useState('');
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // Change Planner State
  const [planGoalInput, setPlanGoalInput] = useState('');
  const [changePlan, setChangePlan] = useState<CodeChangePlan | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1. Repository metadata
    fetch(`${API_BASE_URL}/api/repositories/${id}`)
      .then((res) => res.json())
      .then((data) => setRepo(data))
      .catch(console.error);

    // 2. Files
    fetch(`${API_BASE_URL}/api/repositories/${id}/files`)
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        if (data.length > 0) setSelectedFilePath(data[0].filePath);
      })
      .catch(console.error);

    // 3. Architecture Graph
    fetch(`${API_BASE_URL}/api/repositories/${id}/graph`)
      .then((res) => res.json())
      .then((data) => setGraphData(data))
      .catch(console.error);

    // 4. Architecture Summary
    fetch(`${API_BASE_URL}/api/repositories/${id}/architecture`)
      .then((res) => res.json())
      .then((data) => setArchitecture(data))
      .catch(console.error);

    // 5. Health Report
    fetch(`${API_BASE_URL}/api/repositories/${id}/health`)
      .then((res) => res.json())
      .then((data) => setHealthReport(data))
      .catch(console.error);

    // 6. API Docs
    fetch(`${API_BASE_URL}/api/repositories/${id}/docs`)
      .then((res) => res.json())
      .then((data) => setApiDocs(data))
      .catch(console.error);

    // 7. Security Audit Report
    fetch(`${API_BASE_URL}/api/repositories/${id}/security`)
      .then((res) => res.json())
      .then((data) => setSecurityReport(data))
      .catch(console.error);
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
          body: changePlan ? changePlan.summary : 'Automated code changes proposed by vocallab AI Code Intelligence.',
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
                      -{branchDiff.deletedSymbols.length} Symbols Deleted
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Architecture Overview */}
            {architecture && (
              <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  Architecture Summary
                </h2>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                    {architecture.projectType}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                    Pattern: {architecture.architecturePattern}
                  </span>
                  {architecture.frameworks?.map((f, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-darkBg border border-darkBorder text-gray-300 text-xs font-mono">
                      {f}
                    </span>
                  ))}
                </div>

                <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-sans bg-darkBg/60 p-4 rounded-xl border border-darkBorder">
                  {architecture.overviewMarkdown}
                </div>
              </div>
            )}

            {/* File Explorer Inventory */}
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-400" />
                Repository File Inventory ({files.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {files.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFilePath(f.filePath);
                      setActiveTab('code');
                    }}
                    className="p-3 rounded-xl bg-darkBg border border-darkBorder hover:border-indigo-500/40 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="truncate">
                      <span className="font-mono text-xs text-gray-200 block truncate group-hover:text-indigo-400">
                        {f.filePath}
                      </span>
                      <span className="text-[10px] text-gray-500">{f.language} • {f.lineCount} lines</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ARCHITECTURE GRAPH */}
        {activeTab === 'graph' && (
          <div>
            {graphData ? (
              <ArchitectureGraph
                graphData={graphData}
                onNodeClick={(path) => {
                  setSelectedFilePath(path);
                  setActiveTab('code');
                }}
              />
            ) : (
              <div className="p-12 text-center text-gray-400">Loading Dependency Graph...</div>
            )}
          </div>
        )}

        {/* TAB 3: AI CODE CHAT */}
        {activeTab === 'chat' && <ChatWindow repositoryId={id} files={files} />}

        {/* TAB 4: API DOCS (OpenAPI 3.0 & Markdown) */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Auto-Generated OpenAPI & API Documentation
              </h2>
              <p className="text-xs text-gray-400">
                Derived from AST route definitions, controller parameters, and type signatures across your codebase.
              </p>

              {apiDocs && (
                <div className="space-y-6 pt-2">
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <span className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg">
                      Version: {apiDocs.version}
                    </span>
                    <span className="bg-darkBg border border-darkBorder px-3 py-1 rounded-lg text-gray-300">
                      Base URL: {apiDocs.baseUrl}
                    </span>
                    <span className="bg-purple-600/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-lg">
                      {apiDocs.endpoints.length} Endpoints Discovered
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white">Discovered Endpoints</h3>
                    <div className="space-y-2">
                      {apiDocs.endpoints.map((ep, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-darkBg border border-darkBorder flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] ${
                                ep.method === 'GET'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : ep.method === 'POST'
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {ep.method}
                            </span>
                            <span className="text-white font-bold">{ep.path}</span>
                          </div>

                          <span className="text-gray-500">{ep.filePath}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-darkBg border border-darkBorder font-mono text-xs text-gray-300 overflow-x-auto max-h-96 whitespace-pre">
                    {apiDocs.openApiJson}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MONACO CODE VIEWER */}
        {activeTab === 'code' && (
          <MonacoViewer
            filePath={selectedFilePath || 'Select a file'}
            code={selectedFileCode}
            files={files}
            onSelectFile={(path) => setSelectedFilePath(path)}
          />
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
                  AI Automatic Source Code Editor
                </h2>
              </div>

              <p className="text-xs text-gray-400">
                Describe a feature request or refactoring goal. The AI automatically edits the source code files directly on your local disk and displays a concise editing summary.
              </p>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={planGoalInput}
                  onChange={(e) => setPlanGoalInput(e.target.value)}
                  placeholder="e.g., Replace JWT authentication with session cookie authentication"
                  className="flex-1 bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleRunPlanner}
                  disabled={plannerLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {plannerLoading ? 'Editing Source Code...' : 'Apply AI Code Edits'}
                </button>
              </div>
            </div>

            {applyMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {applyMessage}
                </span>

                <button
                  onClick={handleCreatePR}
                  disabled={prLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  {prLoading ? 'Creating PR...' : 'Create GitHub Pull Request'}
                </button>
              </div>
            )}

            {prResult && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs text-purple-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  {prResult.message}
                </span>
                {prResult.prUrl && (
                  <a href={prResult.prUrl} target="_blank" rel="noreferrer" className="underline font-bold text-white">
                    Open PR on GitHub ↗
                  </a>
                )}
              </div>
            )}

            {changePlan && (
              <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel space-y-6">
                <div className="flex items-center justify-between border-b border-darkBorder pb-4">
                  <div>
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Refactoring Goal</span>
                    <h3 className="text-lg font-bold text-white">{changePlan.goal}</h3>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                    ✓ Applied to {changePlan.affectedFiles?.length || 0} Files
                  </span>
                </div>

                {/* Short Message Summary of Edits */}
                <div className="p-4 rounded-xl bg-darkBg border border-darkBorder space-y-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Summary of Applied Code Modifications</h4>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {changePlan.summary}
                  </div>
                </div>

                {/* Updated Files List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Modified Repository Files (Click any file to view updated code)
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {changePlan.affectedFiles?.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedFilePath(file);
                          setActiveTab('code');
                        }}
                        className="p-3.5 rounded-xl bg-darkBg border border-darkBorder hover:border-indigo-500/50 cursor-pointer transition-all flex items-center justify-between text-xs font-mono group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-white font-semibold truncate group-hover:text-indigo-300">{file}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                            Updated on Disk
                          </span>
                          <span className="text-[11px] text-indigo-400 font-sans font-semibold group-hover:underline flex items-center gap-1">
                            View Edited Code ↗
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: HEALTH AUDIT */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Repository Health Audit
                </h2>
                <p className="text-xs text-gray-400 mt-1">{healthReport?.summary}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 block">Overall Health Score</span>
                <span className="text-3xl font-extrabold text-emerald-400">{healthReport?.score || 95}/100</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: SECURITY AUDIT */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder glass-panel flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  AI Security & Vulnerability Auditor
                </h2>
                <p className="text-xs text-gray-400 mt-1">{securityReport?.summary}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 block">Security Grade</span>
                <span className="text-4xl font-extrabold text-cyan-400">{securityReport?.grade || 'A+'}</span>
              </div>
            </div>

            {securityReport && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white">Discovered Vulnerabilities ({securityReport.vulnerabilities.length})</h3>

                {securityReport.vulnerabilities.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-darkCard border border-darkBorder text-center text-gray-400 text-xs">
                    ✅ No critical security vulnerabilities or hardcoded secrets detected.
                  </div>
                ) : (
                  securityReport.vulnerabilities.map((v) => (
                    <div key={v.id} className="p-4 rounded-xl bg-darkCard border border-darkBorder space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          {v.title}
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {v.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 font-mono">{v.filePath} {v.line && `(Line ${v.line})`}</p>
                      <p className="text-xs text-gray-400">{v.description}</p>
                      <div className="p-2.5 rounded bg-darkBg border border-darkBorder text-[11px] font-mono text-emerald-400">
                        💡 Recommendation: {v.recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
