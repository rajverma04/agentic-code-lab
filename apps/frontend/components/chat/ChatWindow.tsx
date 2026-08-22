'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, FileText, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { ChatMessage, FileMetadata } from '@vocallab/shared';
import { API_BASE_URL } from '../../lib/api';

interface ChatWindowProps {
  repositoryId: string;
  files: FileMetadata[];
  selectedFile?: string | null;
}

export function ChatWindow({ repositoryId, files, selectedFile: initialSelectedFile }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>(initialSelectedFile || '');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sampleQuestions = [
    'How does authentication work in this codebase?',
    'Explain the entry point HTTP routing flow.',
    'Which services and database queries handle user creation?',
    'Summarize the core architectural design of this repository.',
  ];

  const handleSend = async (questionText?: string) => {
    const text = questionText || inputQuestion;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      chatId: 'active',
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          question: text,
          selectedFilePath: selectedFile || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      } else {
        throw new Error('Failed to fetch AI response');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          chatId: 'active',
          sender: 'assistant',
          content: `⚠️ Error processing query: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-darkBg">
      {/* Context Selector Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-darkBorder bg-darkCard/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-gray-300">RAG Context Mode:</span>
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="bg-darkBg border border-darkBorder text-xs text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">🌐 Repository-Wide Search (All Files)</option>
            {files.map((f) => (
              <option key={f.id} value={f.filePath}>
                📄 {f.filePath}
              </option>
            ))}
          </select>
        </div>

        {selectedFile && (
          <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            Focused on: {selectedFile}
          </span>
        )}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Ask Anything About This Codebase</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Agentic CodeLab combines AST parsing, semantic vector search, and graph expansion to give pinpoint precise code explanations with line-by-line source citations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="p-3.5 rounded-xl border border-darkBorder bg-darkCard/60 hover:bg-indigo-600/10 hover:border-indigo-500/40 text-xs text-gray-300 transition-all flex items-start gap-2.5 group"
                >
                  <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-4 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-indigo-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-2xl p-5 border text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white border-indigo-500/30'
                    : 'bg-darkCard text-gray-200 border-darkBorder glass-panel'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content ? m.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() : ''}</div>

                {/* Sources Section */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-darkBorder/80 space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Retrieved Code Sources ({m.sources.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] font-mono bg-darkBg border border-darkBorder px-2.5 py-1 rounded-md text-gray-300 flex items-center gap-1.5"
                        >
                          <span className="text-indigo-400 font-bold">#{idx + 1}</span>
                          <span>{s.filePath}</span>
                          {s.startLine && <span className="text-gray-500">(L{s.startLine}-L{s.endLine})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-white shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-4 items-center text-gray-400 text-xs font-mono">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <span>RAG Engine searching vector store & generating reasoning response...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-darkBorder bg-darkCard/80 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3 bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 focus-within:border-indigo-500 transition-colors"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask a question about authentication, API routes, functions, or dependencies..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
