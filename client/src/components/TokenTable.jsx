import React from 'react';

export default function TokenTable({ tokens }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="empty-state">
        No tokens generated yet. Run analysis on a SQL query.
      </div>
    );
  }

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'KEYWORD':
        return 'badge-keyword';
      case 'IDENTIFIER':
        return 'badge-identifier';
      case 'OPERATOR':
        return 'badge-operator';
      case 'NUMBER':
        return 'badge-number';
      case 'STRING':
        return 'badge-string';
      case 'PUNCTUATION':
        return 'badge-punctuation';
      default:
        return 'badge-unknown';
    }
  };

  return (
    <div className="tokens-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Token Value</th>
            <th>Type</th>
            <th>Line</th>
            <th>Column</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.id}>
              <td className="text-muted">{token.id}</td>
              <td className="token-value">
                <code>{token.value}</code>
              </td>
              <td>
                <span className={`badge ${getTypeBadgeClass(token.type)}`}>
                  {token.type}
                </span>
              </td>
              <td className="text-muted">{token.line}</td>
              <td className="text-muted">{token.column}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
