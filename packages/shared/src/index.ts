// Repository Status
export type RepositoryStatus = 'PENDING' | 'CLONING' | 'SCANNING' | 'PARSING_AST' | 'GENERATING_GRAPH' | 'CHUNKING' | 'EMBEDDING' | 'READY' | 'FAILED';

export interface RepositoryMetadata {
  id: string;
  githubUrl: string;
  name: string;
  owner: string;
  defaultBranch: string;
  stars: number;
  description?: string;
  status: RepositoryStatus;
  progressPercentage: number;
  currentStepMessage?: string;
  fileCount: number;
  symbolCount: number;
  chunkCount: number;
  languageBreakdown: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface FileMetadata {
  id: string;
  repositoryId: string;
  filePath: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  hash: string;
  type: 'source' | 'config' | 'doc' | 'other';
}

export type SymbolType = 'function' | 'class' | 'interface' | 'method' | 'variable' | 'type_alias' | 'export' | 'route';

export interface SymbolInfo {
  id: string;
  repositoryId: string;
  fileId: string;
  filePath: string;
  name: string;
  type: SymbolType;
  startLine: number;
  endLine: number;
  docstring?: string;
  signature?: string;
  parentSymbolId?: string;
  exported: boolean;
  calls?: string[];
  imports?: string[];
}

export interface CodeChunk {
  id: string;
  repositoryId: string;
  filePath: string;
  symbolName?: string;
  symbolType?: SymbolType;
  code: string;
  startLine: number;
  endLine: number;
  summary?: string;
  dependencies: string[];
}

export interface DependencyEdge {
  id: string;
  repositoryId: string;
  sourceFile: string;
  targetFile: string;
  sourceSymbol?: string;
  targetSymbol?: string;
  edgeType: 'import' | 'function_call' | 'inheritance' | 'type_reference' | 'api_route';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'symbol' | 'module';
  filePath: string;
  symbolType?: SymbolType;
  category?: 'controller' | 'service' | 'route' | 'model' | 'util' | 'component' | 'other';
  metrics?: {
    inDegree: number;
    outDegree: number;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    edgeType: string;
  }[];
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: {
    filePath: string;
    startLine?: number;
    endLine?: number;
    snippet?: string;
    score?: number;
  }[];
  codeFlow?: CodeFlowStep[];
}

export interface CodeFlowStep {
  stepIndex: number;
  title: string;
  filePath: string;
  symbolName?: string;
  description: string;
  lineRange?: string;
  snippet?: string;
}

export interface ArchitectureSummary {
  repositoryId: string;
  projectType: string;
  frameworks: string[];
  languages: string[];
  databases: string[];
  authMethod?: string;
  architecturePattern: string;
  overviewMarkdown: string;
  mainModules: {
    name: string;
    description: string;
    entryFiles: string[];
  }[];
}

export interface ImpactAnalysisResult {
  targetSymbol: string;
  targetFile: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  affectedFiles: {
    filePath: string;
    reason: string;
    impactType: 'direct_caller' | 'indirect_caller' | 'database_query' | 'api_consumer';
  }[];
  affectedAPIs: string[];
  affectedComponents: string[];
}

export interface ChangePlanStep {
  stepNumber: number;
  title: string;
  description: string;
  targetFiles: string[];
}

export interface CodeChangePlan {
  id: string;
  repositoryId: string;
  goal: string;
  summary: string;
  steps: ChangePlanStep[];
  affectedFiles: string[];
  proposals?: CodeDiffProposal[];
}

export interface CodeDiffProposal {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diffSummary: string;
}

export interface RepositoryHealthReport {
  score: number; // 0 to 100
  summary: string;
  circularDependencies: {
    cycle: string[];
  }[];
  complexFunctions: {
    symbolName: string;
    filePath: string;
    lines: number;
  }[];
  deadCodeCandidates: {
    symbolName: string;
    filePath: string;
    reason: string;
  }[];
  missingErrorHandling: {
    filePath: string;
    line: number;
  }[];
}

// -------------------------------------------------------------
// NEW ADVANCED FEATURES INTERFACES
// -------------------------------------------------------------

export interface SecurityVulnerability {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  filePath: string;
  line?: number;
  description: string;
  recommendation: string;
}

export interface SecurityAuditReport {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  summary: string;
  vulnerabilities: SecurityVulnerability[];
}

export interface ApiEndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handlerSymbol?: string;
  filePath: string;
  description?: string;
  parameters?: { name: string; type: string; required: boolean }[];
}

export interface RepositoryApiDocumentation {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: ApiEndpointDoc[];
  markdownDoc: string;
  openApiJson: string;
}

export interface PullRequestResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  branchName: string;
  message: string;
}

export interface BranchComparisonResult {
  baseBranch: string;
  compareBranch: string;
  addedSymbols: { name: string; filePath: string; type: string }[];
  deletedSymbols: { name: string; filePath: string; type: string }[];
  modifiedFiles: string[];
  breakingChanges: string[];
  summary: string;
}
