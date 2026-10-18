/**
 * Parser for CD - SQL Query Analyzer
 * Supported grammar subset:
 * <Query>          ::= <SelectStmt> [ ';' ]
 * <SelectStmt>     ::= SELECT [ DISTINCT ] <SelectList> FROM <TableRef> [ WHERE <Condition> ] [ ORDER BY <OrderByList> ]
 * <SelectList>     ::= '*' | <SelectItem> ( ',' <SelectItem> )*
 * <SelectItem>     ::= ( <ColumnRef> | <Literal> ) [ [ AS ] <Identifier> ]
 * <TableRef>       ::= <Identifier> [ [ AS ] <Identifier> ]
 * <Condition>      ::= <OrExpr>
 * <OrExpr>         ::= <AndExpr> ( OR <AndExpr> )*
 * <AndExpr>        ::= <UnaryExpr> ( AND <UnaryExpr> )*
 * <UnaryExpr>      ::= [ NOT ] <ComparisonExpr>
 * <ComparisonExpr> ::= <Operand> <CompOp> <Operand> | '(' <Condition> ')'
 * <CompOp>         ::= '=' | '!=' | '<>' | '<' | '<=' | '>' | '>='
 * <Operand>        ::= <ColumnRef> | <Literal>
 * <OrderByList>    ::= <OrderByItem> ( ',' <OrderByItem> )*
 * <OrderByItem>    ::= <ColumnRef> [ ASC | DESC ]
 * <ColumnRef>      ::= [ <Identifier> '.' ] ( <Identifier> | '*' )
 */

import { TokenType } from '../lexer/lexer.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() {
    return this.tokens[this.pos] || null;
  }

  peek(offset = 1) {
    return this.tokens[this.pos + offset] || null;
  }

  isAtEnd() {
    return this.pos >= this.tokens.length;
  }

  advance() {
    if (!this.isAtEnd()) {
      return this.tokens[this.pos++];
    }
    return null;
  }

  matchKeyword(keyword) {
    const tok = this.current();
    if (tok && tok.type === TokenType.KEYWORD && tok.value.toUpperCase() === keyword.toUpperCase()) {
      return this.advance();
    }
    return null;
  }

  matchOperator(op) {
    const tok = this.current();
    if (tok && tok.type === TokenType.OPERATOR && tok.value === op) {
      return this.advance();
    }
    return null;
  }

  matchPunctuation(punc) {
    const tok = this.current();
    if (tok && tok.type === TokenType.PUNCTUATION && tok.value === punc) {
      return this.advance();
    }
    return null;
  }

  expectKeyword(keyword) {
    const tok = this.current();
    if (!tok) {
      throw new Error(`Expected keyword '${keyword}' but reached end of query`);
    }
    if (tok.type !== TokenType.KEYWORD || tok.value.toUpperCase() !== keyword.toUpperCase()) {
      throw new Error(`Expected keyword '${keyword}' at line ${tok.line}, col ${tok.column}, found '${tok.value}'`);
    }
    return this.advance();
  }

  parse() {
    if (this.tokens.length === 0) {
      throw new Error('Query cannot be empty');
    }

    const first = this.current();
    if (first.type === TokenType.KEYWORD && ['INSERT', 'UPDATE', 'DELETE'].includes(first.value)) {
      throw new Error(`Unsupported statement '${first.value}'. Currently only 'SELECT' queries are supported.`);
    }

    if (first.type !== TokenType.KEYWORD || first.value !== 'SELECT') {
      throw new Error(`Syntax Error: Query must start with 'SELECT' at line ${first.line}, col ${first.column}`);
    }

    const ast = this.parseSelectStatement();

    // Check optional trailing semicolon
    this.matchPunctuation(';');

    if (!this.isAtEnd()) {
      const extra = this.current();
      throw new Error(`Unexpected token '${extra.value}' after query termination at line ${extra.line}, col ${extra.column}`);
    }

    return ast;
  }

  parseSelectStatement() {
    const selectToken = this.expectKeyword('SELECT');
    const isDistinct = !!this.matchKeyword('DISTINCT');

    // Parse Select List
    const selectList = this.parseSelectList();

    // Expect FROM
    this.expectKeyword('FROM');
    const fromClause = this.parseTableRef();

    // Optional WHERE
    let whereClause = null;
    if (this.matchKeyword('WHERE')) {
      whereClause = this.parseCondition();
    }

    // Optional ORDER BY
    let orderByClause = null;
    if (this.matchKeyword('ORDER')) {
      this.expectKeyword('BY');
      orderByClause = this.parseOrderByList();
    }

    // Check for other keywords that are currently not supported in basic parser
    const next = this.current();
    if (next && next.type === TokenType.KEYWORD) {
      if (['GROUP', 'HAVING', 'JOIN', 'LIMIT', 'OFFSET'].includes(next.value)) {
        throw new Error(`Unsupported SQL feature '${next.value}' at line ${next.line}, col ${next.column}. The basic parser currently supports SELECT, FROM, WHERE, and ORDER BY.`);
      }
    }

    return {
      type: 'SelectStatement',
      distinct: isDistinct,
      columns: selectList,
      from: fromClause,
      where: whereClause,
      orderBy: orderByClause
    };
  }

  parseSelectList() {
    const columns = [];

    // Check if wildcard '*'
    if (this.matchOperator('*')) {
      columns.push({
        type: 'Wildcard',
        value: '*'
      });
      // Semicolon or FROM expected next
      return columns;
    }

    while (true) {
      const col = this.parseSelectItem();
      columns.push(col);

      if (this.matchPunctuation(',')) {
        continue;
      }
      break;
    }

    return columns;
  }

  parseSelectItem() {
    const expr = this.parseColumnRefOrLiteral();
    let alias = null;

    if (this.matchKeyword('AS')) {
      const aliasTok = this.parseIdentifier();
      alias = aliasTok.value;
    } else {
      // Optional alias without AS if next token is an identifier and not a keyword like FROM/WHERE
      const tok = this.current();
      if (tok && tok.type === TokenType.IDENTIFIER) {
        alias = this.advance().value;
      }
    }

    return {
      type: 'SelectItem',
      expression: expr,
      alias: alias
    };
  }

  parseColumnRefOrLiteral() {
    const tok = this.current();
    if (!tok) {
      throw new Error('Unexpected end of input while parsing expression');
    }

    if (tok.type === TokenType.NUMBER) {
      this.advance();
      return { type: 'Literal', valueType: 'Number', value: Number(tok.value) };
    }

    if (tok.type === TokenType.STRING) {
      this.advance();
      return { type: 'Literal', valueType: 'String', value: tok.value.slice(1, -1) };
    }

    return this.parseColumnRef();
  }

  parseColumnRef() {
    const firstTok = this.parseIdentifier();
    
    // Check table.column or table.*
    if (this.matchPunctuation('.')) {
      if (this.matchOperator('*')) {
        return {
          type: 'ColumnRef',
          table: firstTok.value,
          column: '*'
        };
      }
      const colTok = this.parseIdentifier();
      return {
        type: 'ColumnRef',
        table: firstTok.value,
        column: colTok.value
      };
    }

    return {
      type: 'ColumnRef',
      table: null,
      column: firstTok.value
    };
  }

  parseIdentifier() {
    const tok = this.current();
    if (!tok) {
      throw new Error('Expected identifier but reached end of query');
    }
    if (tok.type !== TokenType.IDENTIFIER) {
      throw new Error(`Expected identifier at line ${tok.line}, col ${tok.column}, found '${tok.value}'`);
    }
    return this.advance();
  }

  parseTableRef() {
    const tableTok = this.parseIdentifier();
    let alias = null;

    if (this.matchKeyword('AS')) {
      alias = this.parseIdentifier().value;
    } else {
      const tok = this.current();
      if (tok && tok.type === TokenType.IDENTIFIER) {
        alias = this.advance().value;
      }
    }

    return {
      type: 'TableRef',
      table: tableTok.value,
      alias: alias
    };
  }

  parseCondition() {
    return this.parseOrExpr();
  }

  parseOrExpr() {
    let left = this.parseAndExpr();

    while (this.matchKeyword('OR')) {
      const right = this.parseAndExpr();
      left = {
        type: 'LogicalExpr',
        operator: 'OR',
        left,
        right
      };
    }

    return left;
  }

  parseAndExpr() {
    let left = this.parseUnaryExpr();

    while (this.matchKeyword('AND')) {
      const right = this.parseUnaryExpr();
      left = {
        type: 'LogicalExpr',
        operator: 'AND',
        left,
        right
      };
    }

    return left;
  }

  parseUnaryExpr() {
    if (this.matchKeyword('NOT')) {
      const sub = this.parseComparisonExpr();
      return {
        type: 'UnaryExpr',
        operator: 'NOT',
        argument: sub
      };
    }
    return this.parseComparisonExpr();
  }

  parseComparisonExpr() {
    if (this.matchPunctuation('(')) {
      const expr = this.parseCondition();
      if (!this.matchPunctuation(')')) {
        const curr = this.current();
        const line = curr ? curr.line : 'EOF';
        const col = curr ? curr.column : 'EOF';
        throw new Error(`Mismatched parenthesis: Expected ')' at line ${line}, col ${col}`);
      }
      return expr;
    }

    const left = this.parseOperand();
    const opTok = this.current();

    if (!opTok || opTok.type !== TokenType.OPERATOR || !['=', '!=', '<>', '<', '<=', '>', '>='].includes(opTok.value)) {
      const line = opTok ? opTok.line : 'EOF';
      const col = opTok ? opTok.column : 'EOF';
      const found = opTok ? opTok.value : 'end of input';
      throw new Error(`Expected comparison operator (=, !=, <>, <, <=, >, >=) in WHERE clause at line ${line}, col ${col}, found '${found}'`);
    }

    this.advance();
    const right = this.parseOperand();

    return {
      type: 'ComparisonExpr',
      operator: opTok.value,
      left,
      right
    };
  }

  parseOperand() {
    return this.parseColumnRefOrLiteral();
  }

  parseOrderByList() {
    const list = [];
    while (true) {
      const col = this.parseColumnRef();
      let direction = 'ASC';

      if (this.matchKeyword('DESC')) {
        direction = 'DESC';
      } else if (this.matchKeyword('ASC')) {
        direction = 'ASC';
      }

      list.push({
        type: 'OrderByItem',
        column: col,
        direction: direction
      });

      if (this.matchPunctuation(',')) {
        continue;
      }
      break;
    }
    return list;
  }
}

export function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}
