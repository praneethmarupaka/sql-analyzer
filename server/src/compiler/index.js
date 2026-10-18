import { tokenize } from './lexer/lexer.js';
import { parse } from './parser/parser.js';
import { optimize } from './optimizer/optimizer.js';

export function analyzeSql(sqlQuery) {
  if (typeof sqlQuery !== 'string' || sqlQuery.trim() === '') {
    return {
      success: false,
      error: 'Empty SQL query provided. Please enter a valid SQL statement.',
      tokens: [],
      ast: null,
      suggestions: [],
      rewrittenSql: null
    };
  }

  // 1. Lexical Analysis
  const { tokens, errors: lexErrors } = tokenize(sqlQuery);

  if (lexErrors.length > 0) {
    return {
      success: false,
      phase: 'Lexical Analysis',
      error: lexErrors.map(e => e.message).join('; '),
      tokens: tokens.map((t, idx) => ({
        id: idx + 1,
        type: t.type,
        value: t.value,
        line: t.line,
        column: t.column
      })),
      ast: null,
      suggestions: [],
      rewrittenSql: null
    };
  }

  // 2. Syntax Validation / Parsing
  let ast = null;
  try {
    ast = parse(tokens);
  } catch (err) {
    return {
      success: false,
      phase: 'Syntax Analysis (Parsing)',
      error: err.message,
      tokens: tokens.map((t, idx) => ({
        id: idx + 1,
        type: t.type,
        value: t.value,
        line: t.line,
        column: t.column
      })),
      ast: null,
      suggestions: [],
      rewrittenSql: null
    };
  }

  // 3. Query Optimization
  let optimizationResult = { suggestions: [], rewrittenSql: null };
  try {
    optimizationResult = optimize(ast);
  } catch (err) {
    console.error('Optimizer error:', err);
  }

  return {
    success: true,
    phase: 'Completed',
    error: null,
    tokens: tokens.map((t, idx) => ({
      id: idx + 1,
      type: t.type,
      value: t.value,
      line: t.line,
      column: t.column
    })),
    ast,
    suggestions: optimizationResult.suggestions,
    rewrittenSql: optimizationResult.rewrittenSql
  };
}
