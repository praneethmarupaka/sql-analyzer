import React, { useState } from 'react';
import SqlEditor from '../components/SqlEditor';
import ExampleQueries from '../components/ExampleQueries';
import TokenTable from '../components/TokenTable';
import SyntaxStatus from '../components/SyntaxStatus';
import OptimizationSuggestions from '../components/OptimizationSuggestions';
import { analyzeQuery } from '../services/api';

export default function Dashboard() {
  const [query, setQuery] = useState('SELECT id, name, salary FROM employees WHERE 1 = 1 AND salary > 50000 ORDER BY salary DESC;');
  const [activeTab, setActiveTab] = useState('syntax'); // 'syntax' | 'tokens' | 'optimization'
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setApiError(null);

    try {
      const data = await analyzeQuery(query);
      setResult(data);
    } catch (err) {
      setApiError(err.message || 'Failed to connect to backend compiler server');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setApiError(null);
  };

  const handleSelectExample = (exampleSql) => {
    setQuery(exampleSql);
  };

  const handleApplyRewrite = (rewrittenSql) => {
    setQuery(rewrittenSql);
  };

  return (
    <div className="analyzer-app">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">CD</div>
          <div className="brand-text">
            <h1>SQL Query Analyzer & Optimizer</h1>
            <p className="subtitle">Compiler Design: Lexer · Parser · AST · Optimizer</p>
          </div>
        </div>
        <div className="header-meta">
          <span className="grammar-badge">Subset: SELECT · FROM · WHERE · ORDER BY</span>
        </div>
      </header>

      <main className="app-main">
        <div className="top-section">
          <div className="editor-col">
            <SqlEditor
              query={query}
              setQuery={setQuery}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              isLoading={isLoading}
            />
          </div>
          <div className="examples-col">
            <ExampleQueries onSelectExample={handleSelectExample} />
          </div>
        </div>

        {apiError && (
          <div className="alert alert-error main-error">
            <strong>Connection Error:</strong> {apiError}
            <div className="error-tip">Make sure the Express backend server is running on http://localhost:5000.</div>
          </div>
        )}

        <section className="results-section card">
          <div className="results-nav">
            <button
              className={`nav-tab ${activeTab === 'syntax' ? 'active' : ''}`}
              onClick={() => setActiveTab('syntax')}
            >
              1. Syntax Validation
              {result && (
                <span className={`tab-indicator ${result.success ? 'ind-success' : 'ind-error'}`}></span>
              )}
            </button>
            <button
              className={`nav-tab ${activeTab === 'tokens' ? 'active' : ''}`}
              onClick={() => setActiveTab('tokens')}
            >
              2. Lexical Tokens
              {result?.tokens && (
                <span className="tab-count">{result.tokens.length}</span>
              )}
            </button>
            <button
              className={`nav-tab ${activeTab === 'optimization' ? 'active' : ''}`}
              onClick={() => setActiveTab('optimization')}
            >
              3. Query Optimization
              {result?.suggestions && (
                <span className="tab-count">{result.suggestions.length}</span>
              )}
            </button>
          </div>

          <div className="results-content">
            {activeTab === 'syntax' && (
              <SyntaxStatus result={result} />
            )}

            {activeTab === 'tokens' && (
              <TokenTable tokens={result?.tokens || []} />
            )}

            {activeTab === 'optimization' && (
              <OptimizationSuggestions
                suggestions={result?.suggestions || []}
                rewrittenSql={result?.rewrittenSql}
                onApplyRewrite={handleApplyRewrite}
              />
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Built for Compiler Design (CD) Project Evaluation • Pure JavaScript Lexer, Recursive-Descent Parser & Pattern Optimizer
        </p>
      </footer>
    </div>
  );
}
