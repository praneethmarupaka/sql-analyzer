import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '../src/compiler/lexer/lexer.js';
import { parse } from '../src/compiler/parser/parser.js';
import { optimize } from '../src/compiler/optimizer/optimizer.js';
import { analyzeSql } from '../src/compiler/index.js';

test('Lexer: tokenizes basic SELECT query properly', () => {
  const query = "SELECT id, name FROM users WHERE age >= 18 AND status = 'active';";
  const { tokens, errors } = tokenize(query);

  assert.equal(errors.length, 0);
  assert.equal(tokens[0].type, TokenType.KEYWORD);
  assert.equal(tokens[0].value, 'SELECT');
  assert.equal(tokens[1].type, TokenType.IDENTIFIER);
  assert.equal(tokens[1].value, 'id');
  assert.equal(tokens[2].type, TokenType.PUNCTUATION);
  assert.equal(tokens[2].value, ',');
});

test('Lexer: catches unterminated string', () => {
  const query = "SELECT * FROM users WHERE name = 'Alice";
  const { errors } = tokenize(query);
  assert.ok(errors.length > 0);
  assert.match(errors[0].message, /Unterminated string/);
});

test('Parser: parses valid SELECT query with WHERE and ORDER BY', () => {
  const query = "SELECT id, name FROM users WHERE age > 21 ORDER BY name DESC;";
  const res = analyzeSql(query);

  assert.equal(res.success, true);
  assert.equal(res.ast.type, 'SelectStatement');
  assert.equal(res.ast.columns.length, 2);
  assert.equal(res.ast.from.table, 'users');
  assert.equal(res.ast.where.type, 'ComparisonExpr');
  assert.equal(res.ast.where.operator, '>');
  assert.equal(res.ast.orderBy.length, 1);
  assert.equal(res.ast.orderBy[0].direction, 'DESC');
});

test('Parser: catches missing FROM clause', () => {
  const query = "SELECT id, name WHERE age > 21";
  const res = analyzeSql(query);

  assert.equal(res.success, false);
  assert.equal(res.phase, 'Syntax Analysis (Parsing)');
  assert.match(res.error, /Expected keyword 'FROM'/);
});

test('Parser: catches unsupported statements like INSERT', () => {
  const query = "INSERT INTO users VALUES (1, 'Alice');";
  const res = analyzeSql(query);

  assert.equal(res.success, false);
  assert.match(res.error, /Unsupported statement 'INSERT'/);
});

test('Optimizer: detects SELECT * and gives recommendation', () => {
  const query = "SELECT * FROM employees;";
  const res = analyzeSql(query);

  assert.equal(res.success, true);
  const wildcardRule = res.suggestions.find(s => s.id === 'OPT-001');
  assert.ok(wildcardRule);
  assert.match(wildcardRule.rule, /Avoid SELECT \*/);
});

test('Optimizer: detects 1 = 1 tautology and simplifies query', () => {
  const query = "SELECT id, name FROM users WHERE 1 = 1 AND age > 20;";
  const res = analyzeSql(query);

  assert.equal(res.success, true);
  const tautologyRule = res.suggestions.find(s => s.id === 'OPT-002');
  assert.ok(tautologyRule);
  assert.equal(res.rewrittenSql, 'SELECT id, name FROM users WHERE age > 20;');
});
