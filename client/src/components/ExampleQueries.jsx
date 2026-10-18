import React from 'react';

const EXAMPLES = [
  {
    label: 'Valid: Simple Projection',
    type: 'valid',
    query: 'SELECT id, name, email FROM users;'
  },
  {
    label: 'Valid: WHERE & ORDER BY',
    type: 'valid',
    query: 'SELECT name, age, salary FROM employees WHERE age >= 25 AND salary > 50000 ORDER BY salary DESC;'
  },
  {
    label: 'Optimization: SELECT *',
    type: 'optimize',
    query: 'SELECT * FROM customers;'
  },
  {
    label: 'Optimization: Tautology (1 = 1)',
    type: 'optimize',
    query: 'SELECT id, title FROM books WHERE 1 = 1 AND price < 30;'
  },
  {
    label: 'Invalid: Missing FROM',
    type: 'invalid',
    query: 'SELECT id, username WHERE age > 20;'
  },
  {
    label: 'Invalid: Lexical Unterminated String',
    type: 'invalid',
    query: "SELECT id, name FROM users WHERE department = 'Sales;"
  },
  {
    label: 'Invalid: Unsupported INSERT',
    type: 'invalid',
    query: "INSERT INTO products (id, name) VALUES (101, 'Monitor');"
  }
];

export default function ExampleQueries({ onSelectExample }) {
  return (
    <div className="card example-container">
      <div className="card-header">
        <span className="title-text">Preset Examples</span>
        <span className="info-badge">Click to load</span>
      </div>
      <div className="examples-list">
        {EXAMPLES.map((ex, index) => (
          <button
            key={index}
            className={`example-pill pill-${ex.type}`}
            onClick={() => onSelectExample(ex.query)}
            title={ex.query}
          >
            <span className="pill-status"></span>
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
