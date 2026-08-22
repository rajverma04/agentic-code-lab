import { GraphData, GraphNode } from '@vocallab/shared';

export interface FileNodeInfo {
  filePath: string;
  language: string;
  imports: string[];
}

export interface SymbolNodeInfo {
  id: string;
  filePath: string;
  name: string;
  type: string;
  calls: string[];
}

export class GraphService {
  public buildDependencyGraph(files: FileNodeInfo[], symbols: SymbolNodeInfo[]): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphData['edges'] = [];
    const nodeMap = new Map<string, GraphNode>();

    // 1. Create File Nodes
    files.forEach((f) => {
      let category: GraphNode['category'] = 'other';
      const fp = f.filePath.toLowerCase();
      if (fp.includes('controller')) category = 'controller';
      else if (fp.includes('service')) category = 'service';
      else if (fp.includes('route')) category = 'route';
      else if (fp.includes('model') || fp.includes('schema') || fp.includes('entity')) category = 'model';
      else if (fp.includes('component') || fp.includes('page') || fp.includes('view')) category = 'component';
      else if (fp.includes('util') || fp.includes('helper') || fp.includes('config') || fp.includes('middleware')) category = 'util';

      const node: GraphNode = {
        id: f.filePath,
        label: f.filePath.split('/').pop() || f.filePath,
        type: 'file',
        filePath: f.filePath,
        category,
        metrics: { inDegree: 0, outDegree: 0 },
      };

      nodeMap.set(f.filePath, node);
      nodes.push(node);
    });

    // 2. Build Import Edges (ES6 + CommonJS require)
    const filePathSet = new Set(files.map((f) => f.filePath));

    files.forEach((f) => {
      const sourceNode = nodeMap.get(f.filePath);

      f.imports.forEach((imp) => {
        let resolvedTarget: string | undefined;

        // Clean import path (e.g. "../models/user" -> "models/user")
        const baseName = imp.split('/').pop()?.replace(/\.(js|ts|jsx|tsx)$/, '') || '';
        const cleanImp = imp.replace(/^(\.\.\/|\.\/)+/, '').replace(/\.(js|ts|jsx|tsx)$/, '');

        if (cleanImp.length >= 2) {
          for (const targetPath of filePathSet) {
            const targetClean = targetPath.replace(/\.(js|ts|jsx|tsx)$/, '');
            const targetBase = targetPath.split('/').pop()?.replace(/\.(js|ts|jsx|tsx)$/, '') || '';

            if (
              targetClean.endsWith(cleanImp) ||
              (cleanImp.includes('/') && targetClean.includes(cleanImp)) ||
              (baseName.length > 2 && targetBase.toLowerCase() === baseName.toLowerCase())
            ) {
              resolvedTarget = targetPath;
              break;
            }
          }
        }

        if (resolvedTarget && nodeMap.has(resolvedTarget) && resolvedTarget !== f.filePath) {
          const edgeId = `edge_${f.filePath}_${resolvedTarget}`;
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: f.filePath,
              target: resolvedTarget,
              label: 'imports',
              edgeType: 'import',
            });

            if (sourceNode && sourceNode.metrics) sourceNode.metrics.outDegree++;
            const targetNode = nodeMap.get(resolvedTarget);
            if (targetNode && targetNode.metrics) targetNode.metrics.inDegree++;
          }
        }
      });
    });

    // 3. Build Function Call Edges (Symbol level mapping back to files)
    symbols.forEach((s) => {
      const sourceNode = nodeMap.get(s.filePath);

      s.calls.forEach((calledName) => {
        const cleanCall = calledName.split('.').pop() || calledName;
        if (['log', 'error', 'json', 'send', 'status', 'push', 'map', 'filter', 'forEach', 'require', 'config'].includes(cleanCall)) return;

        // Find target symbol or file matching cleanCall
        const targetSym = symbols.find((ts) => ts.name === cleanCall || ts.name.endsWith(`.${cleanCall}`));
        if (targetSym && targetSym.filePath !== s.filePath) {
          const edgeId = `sym_call_${s.filePath}_${targetSym.filePath}`;
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: s.filePath,
              target: targetSym.filePath,
              label: `calls ${cleanCall}`,
              edgeType: 'function_call',
            });

            if (sourceNode && sourceNode.metrics) sourceNode.metrics.outDegree++;
            const targetNode = nodeMap.get(targetSym.filePath);
            if (targetNode && targetNode.metrics) targetNode.metrics.inDegree++;
          }
        }
      });
    });

    return { nodes, edges };
  }
}

export const graphService = new GraphService();
