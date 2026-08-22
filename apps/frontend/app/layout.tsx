import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Agentic CodeLab — AI-Powered Intelligent Codebase Analyzer',
  description: 'AI-native codebase architecture analyzer, RAG assistant, dependency graph explorer, and change planner.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-darkBg text-gray-100 min-h-screen antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
