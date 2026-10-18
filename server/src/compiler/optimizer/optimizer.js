/**
 * Query Optimizer for CD - SQL Query Analyzer
 * Inspects AST to suggest optimizations and generate safe rewrites:
 * 1. Wildcard SELECT * -> Avoid full table projection (suggest explicit column projection)
 * 2. Redundant WHERE conditions like 1 = 1, true tautologies
 * 3. Contradictory WHERE conditions like 1 = 0, x != x
 * 4. Case consistency / formatting
 * 5. Redundant ORDER BY with single constant
 * 6. Wildcard column in table-qualified projection (e.g. users.*)
 */

export function optimize(ast) {
  const suggestions = [];
  let rewrittenSql = null;
  let canRewrite = false;

  if (!ast || ast.type !== 'SelectStatement') {
    return { suggestions, rewrittenSql };
  }

  // Rule 1: SELECT * Detection
  const hasWildcard = ast.columns.some(c => c.type === 'Wildcard' || (c.type === 'SelectItem' && c.expression.column === '*'));
  if (hasWildcard) {
    suggestions.push({
      id: 'OPT-001',
      severity: 'WARNING',
      rule: 'Avoid SELECT *',
      message: 'Using SELECT * retrieves all columns from the table, increasing memory, network I/O, and disabling covering indexes.',
      recommendation: 'Replace * with explicitly required columns (e.g., SELECT id, name FROM ...).'
    });
  }

  // Rule 2: Inspect WHERE clause for tautologies or dead code (e.g., 1 = 1 or col = col when literals)
  if (ast.where) {
    checkConditionRules(ast.where, suggestions);
  }

  // Rule 3: Redundant ORDER BY check
  if (ast.orderBy) {
    for (const item of ast.orderBy) {
      if (item.column && item.column.table === null && !isNaN(Number(item.column.column))) {
        suggestions.push({
          id: 'OPT-003',
          severity: 'INFO',
          rule: 'Positional / Constant ORDER BY',
          message: `Ordering by position or constant (${item.column.column}) impairs readability and schema evolution.`,
          recommendation: 'Specify exact column names in the ORDER BY clause.'
        });
      }
    }
  }

  // Generate safe rewritten SQL when applicable (e.g. simplifying tautological WHERE 1=1 or standardizing format)
  // Check if WHERE clause has 1 = 1 that can be safely simplified
  if (ast.where) {
    const simplifiedWhere = simplifyCondition(ast.where);
    if (simplifiedWhere.wasModified) {
      canRewrite = true;
      suggestions.push({
        id: 'OPT-004',
        severity: 'INFO',
        rule: 'Simplify Redundant Conditions',
        message: 'A redundant condition (such as 1 = 1) was detected in the WHERE filter and can be safely eliminated.',
        recommendation: 'Remove redundant predicates to allow the query planner to evaluate filters faster.'
      });

      rewrittenSql = generateSql({
        ...ast,
        where: simplifiedWhere.node
      });
    }
  }

  // If no rewrite was performed but syntax is well-formed, we can also generate canonical formatted SQL if desired
  if (!rewrittenSql && suggestions.length > 0) {
    // If only SELECT * warning exists, we cannot automatically guess user's intended columns, so do not guess
  }

  return {
    suggestions,
    rewrittenSql
  };
}

function checkConditionRules(condition, suggestions) {
  if (!condition) return;

  if (condition.type === 'ComparisonExpr') {
    const { left, operator, right } = condition;
    
    // Check literal equality (e.g. 1 = 1)
    if (left.type === 'Literal' && right.type === 'Literal') {
      if (operator === '=' && left.value === right.value) {
        suggestions.push({
          id: 'OPT-002',
          severity: 'WARNING',
          rule: 'Tautological Condition Detected',
          message: `Predicate '${left.value} = ${right.value}' is always true. It adds evaluation overhead and confuses cost-based optimizers.`,
          recommendation: 'Remove redundant true conditions from the WHERE clause.'
        });
      } else if ((operator === '!=' || operator === '<>') && left.value === right.value) {
        suggestions.push({
          id: 'OPT-005',
          severity: 'HIGH_WARNING',
          rule: 'Contradictory Condition Detected',
          message: `Predicate '${left.value} ${operator} ${right.value}' is always false. The query will return 0 rows.`,
          recommendation: 'Verify query logic as this filter will guarantee an empty result set.'
        });
      }
    }

    // Check same column equality without qualification (e.g. id != id)
    if (left.type === 'ColumnRef' && right.type === 'ColumnRef') {
      if (left.column === right.column && left.table === right.table) {
        if (operator === '!=' || operator === '<>') {
          suggestions.push({
            id: 'OPT-006',
            severity: 'HIGH_WARNING',
            rule: 'Contradictory Column Filter',
            message: `Condition '${left.column} ${operator} ${right.column}' will filter out all non-null values.`,
            recommendation: 'Check column names in condition.'
          });
        }
      }
    }
  } else if (condition.type === 'LogicalExpr') {
    checkConditionRules(condition.left, suggestions);
    checkConditionRules(condition.right, suggestions);
  } else if (condition.type === 'UnaryExpr') {
    checkConditionRules(condition.argument, suggestions);
  }
}

function simplifyCondition(cond) {
  if (!cond) return { node: null, wasModified: false };

  if (cond.type === 'ComparisonExpr') {
    // If it is 1 = 1 (tautology)
    if (cond.left.type === 'Literal' && cond.right.type === 'Literal' && cond.operator === '=' && cond.left.value === cond.right.value) {
      return { node: null, wasModified: true, isAlwaysTrue: true };
    }
    return { node: cond, wasModified: false };
  }

  if (cond.type === 'LogicalExpr') {
    const leftRes = simplifyCondition(cond.left);
    const rightRes = simplifyCondition(cond.right);

    if (cond.operator === 'AND') {
      if (leftRes.isAlwaysTrue && rightRes.isAlwaysTrue) {
        return { node: null, wasModified: true, isAlwaysTrue: true };
      }
      if (leftRes.isAlwaysTrue) {
        return { node: rightRes.node, wasModified: true };
      }
      if (rightRes.isAlwaysTrue) {
        return { node: leftRes.node, wasModified: true };
      }
    }

    return {
      node: {
        type: 'LogicalExpr',
        operator: cond.operator,
        left: leftRes.node || cond.left,
        right: rightRes.node || cond.right
      },
      wasModified: leftRes.wasModified || rightRes.wasModified
    };
  }

  return { node: cond, wasModified: false };
}

function generateSql(ast) {
  let sql = 'SELECT ';
  if (ast.distinct) sql += 'DISTINCT ';

  const colStrs = ast.columns.map(col => {
    if (col.type === 'Wildcard') return '*';
    let s = formatOperand(col.expression);
    if (col.alias) s += ` AS ${col.alias}`;
    return s;
  });
  sql += colStrs.join(', ');

  sql += ` FROM ${ast.from.table}`;
  if (ast.from.alias) sql += ` AS ${ast.from.alias}`;

  if (ast.where) {
    const whereStr = formatCondition(ast.where);
    if (whereStr) {
      sql += ` WHERE ${whereStr}`;
    }
  }

  if (ast.orderBy && ast.orderBy.length > 0) {
    const orderItems = ast.orderBy.map(item => {
      return `${formatOperand(item.column)} ${item.direction}`;
    });
    sql += ` ORDER BY ${orderItems.join(', ')}`;
  }

  sql += ';';
  return sql;
}

function formatOperand(op) {
  if (!op) return '';
  if (op.type === 'ColumnRef') {
    return op.table ? `${op.table}.${op.column}` : op.column;
  }
  if (op.type === 'Literal') {
    return op.valueType === 'String' ? `'${op.value}'` : `${op.value}`;
  }
  return '';
}

function formatCondition(cond) {
  if (!cond) return '';
  if (cond.type === 'ComparisonExpr') {
    return `${formatOperand(cond.left)} ${cond.operator} ${formatOperand(cond.right)}`;
  }
  if (cond.type === 'LogicalExpr') {
    return `${formatCondition(cond.left)} ${cond.operator} ${formatCondition(cond.right)}`;
  }
  if (cond.type === 'UnaryExpr') {
    return `NOT (${formatCondition(cond.argument)})`;
  }
  return '';
}
