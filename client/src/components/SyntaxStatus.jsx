import React from 'react';

export default function SyntaxStatus({ result }) {
  if (!result) {
    return (
      <div className="empty-state">
        Run an analysis to inspect syntax validation.
      </div>
    );
  }

  const { success, error, phase, ast } = result;

  return (
    <div className="syntax-status-container">
      {success ? (
        <div className="alert alert-success">
          <div className="alert-header">
            <span className="icon">✓</span>
            <strong>Syntax Valid</strong>
          </div>
          <p className="alert-body">
            The SQL query adheres to grammar specifications (<code className="inline-code">SELECT ... FROM ... [WHERE] [ORDER BY]</code>).
          </p>
        </div>
      ) : (
        <div className="alert alert-error">
          <div className="alert-header">
            <span className="icon">✕</span>
            <strong>Syntax Error ({phase || 'Compilation Error'})</strong>
          </div>
          <p className="alert-body error-message">
            {error}
          </p>
        </div>
      )}

      {ast && (
        <div className="ast-summary">
          <h4 className="section-subtitle">Parsed Abstract Syntax Tree (AST) Summary</h4>
          <div className="ast-grid">
            <div className="ast-card">
              <span className="ast-label">Statement</span>
              <span className="ast-value">{ast.type}</span>
            </div>
            <div className="ast-card">
              <span className="ast-label">Target Table</span>
              <span className="ast-value">{ast.from?.table || 'N/A'}{ast.from?.alias ? ` (AS ${ast.from.alias})` : ''}</span>
            </div>
            <div className="ast-card">
              <span className="ast-label">Columns Count</span>
              <span className="ast-value">{ast.columns?.length || 0}</span>
            </div>
            <div className="ast-card">
              <span className="ast-label">WHERE Clause</span>
              <span className="ast-value">{ast.where ? 'Active Predicate' : 'None'}</span>
            </div>
            <div className="ast-card">
              <span className="ast-label">ORDER BY</span>
              <span className="ast-value">{ast.orderBy ? `${ast.orderBy.length} column(s)` : 'None'}</span>
            </div>
            <div className="ast-card">
              <span className="ast-label">DISTINCT</span>
              <span className="ast-value">{ast.distinct ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
