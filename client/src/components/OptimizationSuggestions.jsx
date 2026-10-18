import React, { useState } from 'react';

export default function OptimizationSuggestions({ suggestions, rewrittenSql, onApplyRewrite }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (rewrittenSql) {
      navigator.clipboard.writeText(rewrittenSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="optimization-container">
      {rewrittenSql && (
        <div className="rewrite-box">
          <div className="rewrite-header">
            <span className="badge badge-success">Optimized Query Available</span>
            <div className="rewrite-actions">
              <button className="btn-small btn-secondary" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {onApplyRewrite && (
                <button
                  className="btn-small btn-primary"
                  onClick={() => onApplyRewrite(rewrittenSql)}
                >
                  Load in Editor
                </button>
              )}
            </div>
          </div>
          <pre className="sql-code-block">
            <code>{rewrittenSql}</code>
          </pre>
        </div>
      )}

      {hasSuggestions ? (
        <div className="suggestions-list">
          {suggestions.map((item) => (
            <div key={item.id} className={`suggestion-card card-${item.severity.toLowerCase()}`}>
              <div className="suggestion-head">
                <span className="suggestion-rule">{item.rule}</span>
                <span className={`severity-tag severity-${item.severity.toLowerCase()}`}>
                  {item.severity}
                </span>
              </div>
              <p className="suggestion-message">{item.message}</p>
              <div className="suggestion-rec">
                <strong>Recommendation:</strong> {item.recommendation}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {rewrittenSql
            ? 'Query optimizations generated above.'
            : 'No optimization warnings detected for this query structure. All standard rules passed!'}
        </div>
      )}
    </div>
  );
}
