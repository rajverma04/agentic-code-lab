'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData } from '@vocallab/shared';
import { Network, ArrowRight, ArrowLeft, X, Eye, Target, Maximize2, Minimize2 } from 'lucide-react';

interface ArchitectureGraphProps {
  graphData: GraphData;
  onNodeClick?: (filePath: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  controller: { bg: '#3b82f6', border: '#60a5fa', text: '#ffffff' },
  service: { bg: '#8b5cf6', border: '#a78bfa', text: '#ffffff' },
  route: { bg: '#10b981', border: '#34d399', text: '#ffffff' },
  model: { bg: '#f59e0b', border: '#fbbf24', text: '#ffffff' },
  component: { bg: '#ec4899', border: '#f472b6', text: '#ffffff' },
  util: { bg: '#6b7280', border: '#9ca3af', text: '#ffffff' },
  other: { bg: '#4b5563', border: '#6b7280', text: '#ffffff' },
};

export function ArchitectureGraph({ graphData, onNodeClick }: ArchitectureGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const selectedNode = useMemo(() => {
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData]);

  const incomingEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return graphData.edges.filter((e) => e.target === selectedNodeId);
  }, [selectedNodeId, graphData]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return graphData.edges.filter((e) => e.source === selectedNodeId);
  }, [selectedNodeId, graphData]);

  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    const cols = 4;
    const spacingX = 280;
    const spacingY = 120;

    graphData.nodes.forEach((n, idx) => {
      const category = n.category || 'other';
      const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

      const row = Math.floor(idx / cols);
      const col = idx % cols;

      const isSelected = n.id === selectedNodeId;
      const isCaller = incomingEdges.some((e) => e.source === n.id);
      const isCallee = outgoingEdges.some((e) => e.target === n.id);

      let customBorder = colors.border;
      if (isSelected) customBorder = '#ffffff';
      else if (isCaller) customBorder = '#06b6d4'; // Glowing Cyan for Callers
      else if (isCallee) customBorder = '#a855f7'; // Glowing Purple for Callees

      rfNodes.push({
        id: n.id,
        position: { x: col * spacingX + 50, y: row * spacingY + 50 },
        data: {
          label: (
            <div className="p-2 flex flex-col gap-1 text-left">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">{category}</span>
              <span className="font-mono text-xs font-semibold truncate max-w-[180px]">{n.label}</span>
            </div>
          ),
        },
        style: {
          background: colors.bg,
          borderColor: customBorder,
          color: colors.text,
          borderWidth: isSelected || isCaller || isCallee ? '3px' : '2px',
          borderRadius: '12px',
          boxShadow: isSelected
            ? '0 0 20px rgba(255,255,255,0.6)'
            : isCaller
            ? '0 0 16px rgba(6,182,212,0.6)'
            : isCallee
            ? '0 0 16px rgba(168,85,247,0.6)'
            : '0 4px 14px rgba(0,0,0,0.4)',
          width: 200,
        },
      });
    });

    // Render Edges based on showAllConnections state or selected node
    const edgesToRender = showAllConnections
      ? graphData.edges
      : selectedNodeId
      ? graphData.edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      : [];

    edgesToRender.forEach((e) => {
      const isIncoming = e.target === selectedNodeId;
      const isOutgoing = e.source === selectedNodeId;

      let edgeColor = '#818cf8';
      let strokeWidth = 2;

      if (isIncoming) {
        edgeColor = '#06b6d4'; // Cyan for incoming
        strokeWidth = 3.5;
      } else if (isOutgoing) {
        edgeColor = '#a855f7'; // Purple for outgoing
        strokeWidth = 3.5;
      }

      rfEdges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || '',
        animated: isIncoming || isOutgoing || e.edgeType === 'function_call',
        style: { stroke: edgeColor, strokeWidth },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        labelStyle: { fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#111827' },
      });
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [graphData, selectedNodeId, showAllConnections, incomingEdges, outgoingEdges]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-darkBg overflow-hidden relative flex p-2'
          : 'w-full h-[calc(100vh-140px)] bg-darkBg border border-darkBorder rounded-2xl overflow-hidden relative flex'
      }
    >
      {/* Toolbar & Controls Header */}
      <div className="absolute top-4 left-4 z-10 bg-darkCard/90 backdrop-blur-md p-3 rounded-xl border border-darkBorder flex flex-wrap items-center gap-3 text-xs shadow-2xl">
        <span className="font-semibold text-gray-300">Layers:</span>
        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.bg }} />
            <span className="capitalize text-gray-400 text-[11px]">{cat}</span>
          </div>
        ))}

        {/* Connections Mode Toggle Button */}
        <button
          onClick={() => setShowAllConnections(!showAllConnections)}
          className={`ml-2 px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            showAllConnections
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-md'
              : 'bg-darkBg text-gray-300 border-darkBorder hover:border-gray-500'
          }`}
        >
          {showAllConnections ? (
            <>
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Showing All Connections ({graphData.edges.length})
            </>
          ) : (
            <>
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Click-to-Show Node Connections
            </>
          )}
        </button>

        {/* Full Screen Toggle Button */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="ml-2 px-3 py-1.5 rounded-lg border bg-darkBg border-darkBorder hover:border-indigo-500 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-rose-400" />
              Exit Full Screen (Esc)
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              Full Screen ⛶
            </>
          )}
        </button>

        {selectedNodeId && (
          <div className="ml-2 pl-3 border-l border-darkBorder flex items-center gap-3 font-mono text-[11px]">
            <span className="text-cyan-400 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Incoming Callers ({incomingEdges.length})
            </span>
            <span className="text-purple-400 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Outgoing Callees ({outgoingEdges.length})
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_evt, node) => setSelectedNodeId(node.id)}
          fitView
        >
          <Background color="#1e293b" gap={16} />
          <Controls className="bg-darkCard border-darkBorder text-white fill-white" />
          <MiniMap nodeColor="#4f46e5" maskColor="rgba(9, 13, 22, 0.8)" className="bg-darkCard border-darkBorder" />
        </ReactFlow>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="w-80 bg-darkCard border-l border-darkBorder p-5 overflow-y-auto flex flex-col justify-between shrink-0 glass-panel shadow-2xl z-20">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-darkBorder">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Network className="w-4 h-4" />
                File Details
              </span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-mono text-sm font-bold text-white break-all">{selectedNode.label}</h3>
              <p className="font-mono text-[11px] text-gray-400 mt-1 break-all">{selectedNode.filePath}</p>
            </div>

            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded bg-darkBg border border-darkBorder text-[10px] uppercase font-bold text-indigo-400">
                {selectedNode.category}
              </span>
              <span className="px-2.5 py-1 rounded bg-darkBg border border-darkBorder text-[10px] font-mono text-gray-300">
                In: {selectedNode.metrics?.inDegree || 0} • Out: {selectedNode.metrics?.outDegree || 0}
              </span>
            </div>

            {/* Incoming Connections */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Imported / Called By ({incomingEdges.length})
              </h4>
              {incomingEdges.length === 0 ? (
                <p className="text-[11px] text-gray-500 italic">No incoming imports detected.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {incomingEdges.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedNodeId(e.source)}
                      className="p-2 rounded bg-darkBg border border-darkBorder hover:border-cyan-500/50 cursor-pointer text-xs font-mono text-gray-300 truncate"
                    >
                      {e.source.split('/').pop()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Connections */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-purple-400 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                Imports / Calls ({outgoingEdges.length})
              </h4>
              {outgoingEdges.length === 0 ? (
                <p className="text-[11px] text-gray-500 italic">No outgoing imports detected.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {outgoingEdges.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedNodeId(e.target)}
                      className="p-2 rounded bg-darkBg border border-darkBorder hover:border-purple-500/50 cursor-pointer text-xs font-mono text-gray-300 truncate"
                    >
                      {e.target.split('/').pop()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {onNodeClick && (
            <button
              onClick={() => onNodeClick(selectedNode.filePath)}
              className="w-full mt-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              Open Source Code ↗
            </button>
          )}
        </div>
      )}
    </div>
  );
}
