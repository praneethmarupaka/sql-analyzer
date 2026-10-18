/**
 * Token definitions and SQL Lexer for CD - SQL Query Analyzer
 */

export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  OPERATOR: 'OPERATOR',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  PUNCTUATION: 'PUNCTUATION',
  UNKNOWN: 'UNKNOWN'
};

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'ORDER',
  'BY',
  'ASC',
  'DESC',
  'AND',
  'OR',
  'NOT',
  'AS',
  'LIMIT',
  'OFFSET',
  'DISTINCT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'GROUP',
  'HAVING',
  'IN',
  'LIKE',
  'BETWEEN',
  'IS',
  'NULL'
]);

export class Token {
  constructor(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

export function tokenize(sql) {
  const tokens = [];
  const errors = [];
  let index = 0;
  let line = 1;
  let lineStart = 0;

  function getCol() {
    return index - lineStart + 1;
  }

  while (index < sql.length) {
    const char = sql[index];

    // Whitespace
    if (char === ' ' || char === '\t' || char === '\r') {
      index++;
      continue;
    }

    // Newlines
    if (char === '\n') {
      line++;
      index++;
      lineStart = index;
      continue;
    }

    // Comments (-- comment until newline)
    if (char === '-' && index + 1 < sql.length && sql[index + 1] === '-') {
      index += 2;
      while (index < sql.length && sql[index] !== '\n') {
        index++;
      }
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      const startCol = getCol();
      let numStr = '';
      while (index < sql.length && /[0-9]/.test(sql[index])) {
        numStr += sql[index];
        index++;
      }
      if (index < sql.length && sql[index] === '.') {
        numStr += '.';
        index++;
        while (index < sql.length && /[0-9]/.test(sql[index])) {
          numStr += sql[index];
          index++;
        }
      }
      tokens.push(new Token(TokenType.NUMBER, numStr, line, startCol));
      continue;
    }

    // String literals ('string')
    if (char === "'") {
      const startCol = getCol();
      index++; // skip starting quote
      let strVal = '';
      let closed = false;

      while (index < sql.length) {
        if (sql[index] === "'") {
          if (index + 1 < sql.length && sql[index + 1] === "'") {
            // Escaped single quote
            strVal += "'";
            index += 2;
          } else {
            closed = true;
            index++;
            break;
          }
        } else if (sql[index] === '\n') {
          line++;
          index++;
          lineStart = index;
          strVal += '\n';
        } else {
          strVal += sql[index];
          index++;
        }
      }

      if (!closed) {
        errors.push({
          line,
          column: startCol,
          message: `Unterminated string literal starting at line ${line}, column ${startCol}`
        });
      }
      tokens.push(new Token(TokenType.STRING, `'${strVal}'`, line, startCol));
      continue;
    }

    // Punctuation
    if (char === ',' || char === ';' || char === '(' || char === ')' || char === '.') {
      tokens.push(new Token(TokenType.PUNCTUATION, char, line, getCol()));
      index++;
      continue;
    }

    // Operators: <=, >=, !=, <>, =, <, >, +, -, *, /
    // Check 2-char operators first
    const twoChar = sql.substring(index, index + 2);
    if (twoChar === '<=' || twoChar === '>=' || twoChar === '!=' || twoChar === '<>') {
      tokens.push(new Token(TokenType.OPERATOR, twoChar, line, getCol()));
      index += 2;
      continue;
    }

    if (char === '=' || char === '<' || char === '>' || char === '*' || char === '+' || char === '-' || char === '/') {
      tokens.push(new Token(TokenType.OPERATOR, char, line, getCol()));
      index++;
      continue;
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_]/.test(char)) {
      const startCol = getCol();
      let ident = '';
      while (index < sql.length && /[a-zA-Z0-9_]/.test(sql[index])) {
        ident += sql[index];
        index++;
      }

      const upper = ident.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push(new Token(TokenType.KEYWORD, upper, line, startCol));
      } else {
        tokens.push(new Token(TokenType.IDENTIFIER, ident, line, startCol));
      }
      continue;
    }

    // Unknown/unsupported character
    errors.push({
      line,
      column: getCol(),
      message: `Unrecognized character '${char}' at line ${line}, column ${getCol()}`
    });
    tokens.push(new Token(TokenType.UNKNOWN, char, line, getCol()));
    index++;
  }

  return { tokens, errors };
}
