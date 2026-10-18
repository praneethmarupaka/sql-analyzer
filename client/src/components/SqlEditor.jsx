import React from 'react';

export default function SqlEditor({ query, setQuery, onAnalyze, onClear, isLoading }) {
  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onAnalyze();
    }
  };

  return (
    <div className="card editor-container">
      <div className="card-header">
        <div className="header-title">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
          <span className="title-text">SQL Query Editor</span>
        </div>
        <span className="shortcut-hint">Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to analyze</span>
      </div>
      <div className="editor-body">
        <textarea
          className="sql-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a SQL query (e.g., SELECT id, name FROM users WHERE age >= 18;)..."
          rows={7}
          spellCheck="false"
        />
      </div>
      <div className="editor-actions">
        <button
          className="btn btn-secondary"
          onClick={onClear}
          disabled={isLoading || !query.trim()}
        >
          Clear
        </button>
        <button
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Query'}
        </button>
      </div>
    </div>
  );
}
