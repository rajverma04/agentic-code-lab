'use client';

import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { FileMetadata } from '@vocallab/shared';
import { FileText, Search, Folder } from 'lucide-react';

interface MonacoViewerProps {
  filePath: string;
  code: string;
  files?: FileMetadata[];
  onSelectFile?: (filePath: string) => void;
  originalCode?: string;
  proposedCode?: string;
  isDiffMode?: boolean;
}

export function MonacoViewer({
  filePath,
  code,
  files = [],
  onSelectFile,
  originalCode,
  proposedCode,
  isDiffMode = false,
}: MonacoViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'py') return 'python';
    if (ext === 'json') return 'json';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'md') return 'markdown';
    return 'plaintext';
  };

  const filteredFiles = files.filter((f) => f.filePath.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full h-[calc(100vh-140px)] bg-darkCard border border-darkBorder rounded-2xl overflow-hidden flex">
      {/* File Explorer Sidebar */}
      {files.length > 0 && (
        <div className="w-72 bg-darkBg border-r border-darkBorder flex flex-col shrink-0">
          <div className="p-3 border-b border-darkBorder flex items-center gap-2">
            <Folder className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-gray-200">Repository Files ({files.length})</span>
          </div>

          <div className="p-2 border-b border-darkBorder">
            <div className="flex items-center gap-2 bg-darkCard border border-darkBorder rounded-lg px-2.5 py-1.5 text-xs text-gray-300">
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-transparent placeholder-gray-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {filteredFiles.map((f) => {
              const isSelected = f.filePath === filePath;
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectFile && onSelectFile(f.filePath)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono truncate flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                  <span className="truncate">{f.filePath}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Monaco Code Area */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-2.5 bg-darkBg border-b border-darkBorder flex items-center justify-between">
          <span className="font-mono text-xs text-indigo-400 font-semibold">{filePath || 'Select a file'}</span>
          {isDiffMode && (
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Side-by-Side Git Diff Proposal
            </span>
          )}
        </div>

        <div className="flex-1">
          {isDiffMode ? (
            <DiffEditor
              original={originalCode || ''}
              modified={proposedCode || ''}
              language={getLanguage(filePath)}
              theme="vs-dark"
              options={{
                readOnly: true,
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
              }}
            />
          ) : (
            <Editor
              value={code}
              language={getLanguage(filePath)}
              theme="vs-dark"
              options={{
                readOnly: true,
                fontSize: 13,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
