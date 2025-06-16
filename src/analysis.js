// src/analysis.js
// VERSION 1.608D
import { compareTwoStrings } from 'string-similarity'

/**
 * Assigns each txn to a category:
 * 1) Count keywords; if exactly one top‐hit, choose it.
 * 2) If multiple tie, fuzzy‐match category NAMES.
 * 3) Else do simple includes lookup (or 'Uncategorized').
 */
export function categorizeTransactions(transactions, dictionary, options = {}) {
  const { nameThreshold = 0.6 } = options

  return transactions.map(txn => {
    const lc = String(txn.description).toLowerCase()

    // 1) Keyword hits
    const hits = Object.fromEntries(
      Object.entries(dictionary)
        .map(([cat, kws]) => [
          cat,
          kws.reduce((cnt, kw) => cnt + (lc.includes(kw.toLowerCase()) ? 1 : 0), 0)
        ])
        .filter(([, cnt]) => cnt > 0)
    )

    const hitCats = Object.keys(hits)
    if (hitCats.length === 1) {
      return { ...txn, category: hitCats[0] }
    }
    if (hitCats.length > 1) {
      // find max count
      const max = Math.max(...hitCats.map(c => hits[c]))
      const top = hitCats.filter(c => hits[c] === max)
      if (top.length === 1) {
        return { ...txn, category: top[0] }
      }
          if (top.length > 1) {
      // Prioritize if one of the tied categories is mentioned in the description
      const directMatch = top.find(c => lc.includes(c.toLowerCase()));
      if (directMatch) {
        return { ...txn, category: directMatch };
      }

      // Fuzzy match fallback
      const nameMatches = top.map(cat => ({
        cat,
        score: compareTwoStrings(lc, cat.toLowerCase())
      })).filter(({ score }) => score >= nameThreshold);

      if (nameMatches.length === 1) {
        return { ...txn, category: nameMatches[0].cat };
      }
      if (nameMatches.length > 1) {
        return { ...txn, category: nameMatches.sort((a, b) => b.score - a.score)[0].cat };
      }
    }
    }

    // 2) Fuzzy match on category NAMES
    const nameMatches = Object.keys(dictionary)
      .map(cat => ({
        cat,
        score: compareTwoStrings(lc, cat.toLowerCase())
      }))
      .filter(({ score }) => score >= nameThreshold)

    if (nameMatches.length === 1) {
      return { ...txn, category: nameMatches[0].cat }
    }
    if (nameMatches.length > 1) {
      // pick highest‐scoring
      const best = nameMatches.sort((a, b) => b.score - a.score)[0]
      return { ...txn, category: best.cat }
    }

    // 3) Fallback simple lookup
    const simple = 
      Object.keys(dictionary).find(cat =>
        dictionary[cat].some(kw => lc.includes(kw.toLowerCase()))
      ) || 'Uncategorized'

    return { ...txn, category: simple }
  })
}

/**
 * Summarize total by category.
 */
export function summarizeByCategory(categorizedTxns) {
  return categorizedTxns.reduce((sum, { category, amount }) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    sum[category] = (sum[category] || 0) + num;
    return sum;
  }, {});
}

const OPS = {
  NOT: { prec: 3, assoc: 'right' },
  AND: { prec: 2, assoc: 'left' },
  OR: { prec: 1, assoc: 'left' },
};

/**
 * Parse a date string as a local date (midnight).
 * Supports ISO (YYYY-MM-DD) and US (MM/DD/YYYY). Throws on invalid.
 */
function parseDateLocal(str) {
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, Y, M, D] = m;
    return new Date(+Y, +M - 1, +D);
  }
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, M, D, Y] = m;
    return new Date(+Y, +M - 1, +D);
  }
  const d = new Date(str);
  if (isNaN(d)) throw new Error('Invalid syntax');
  return d;
}

/** Escape a string for use in a RegExp */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Tokenize the query string into operators, parentheses, and terms */
function tokenize(query) {
  const tokens = [];
  const re = /\s*(\(|\)|AND|OR|NOT|[^()\s]+)\s*/gi;
  let m;
  while ((m = re.exec(query))) tokens.push(m[1]);
  return tokens;
}

/** Convert tokens to Reverse Polish Notation using shunting-yard */
function toRPN(tokens) {
  const out = [];
  const stack = [];
  for (const t of tokens) {
    const up = t.toUpperCase();
    if (up === '(') {
      stack.push(up);
    } else if (up === ')') {
      while (stack.length && stack.at(-1) !== '(') {
        out.push(stack.pop());
      }
      if (stack.at(-1) !== '(') throw new Error('Mismatched parentheses');
      stack.pop();
    } else if (OPS[up]) {
      const { prec, assoc } = OPS[up];
      while (stack.length && OPS[stack.at(-1)]) {
        const top = stack.at(-1);
        if (
          (assoc === 'left' && prec <= OPS[top].prec) ||
          (assoc === 'right' && prec < OPS[top].prec)
        ) {
          out.push(stack.pop());
        } else break;
      }
      stack.push(up);
    } else {
      out.push(t);
    }
  }
  if (stack.some(x => x === '(' || x === ')')) throw new Error('Mismatched parentheses');
  while (stack.length) out.push(stack.pop());
  return out;
}

/** Evaluate a single term or comparison token against a transaction */
function evalToken(token, txn) {
  const m = token.match(
    /^([a-zA-Z]+)\s*(<=|>=|!=|=|<|>|\^=|\$=|:)\s*(.+)$/
  );
  if (m) {
    const [, field, op, raw] = m;
    const val = raw.trim();
    if (field === 'amount') {
      const num = Number(val), amt = Number(txn.amount);
      if (isNaN(num)) throw new Error('Invalid syntax');
      switch (op) {
        case '>': return amt > num;
        case '<': return amt < num;
        case '>=': return amt >= num;
        case '<=': return amt <= num;
        case '=': return amt === num;
        case '!=': return amt !== num;
      }
    }
    if (field === 'date') {
      const d1 = parseDateLocal(txn.date);
      const d2 = parseDateLocal(val);
      switch (op) {
        case '>': return d1 > d2;
        case '<': return d1 < d2;
        case '>=': return d1 >= d2;
        case '<=': return d1 <= d2;
        case '=': return d1.getTime() === d2.getTime();
        case '!=': return d1.getTime() !== d2.getTime();
      }
    }
    if (field === 'description' || field === 'category') {
      const txt = String(txn[field]||'').toLowerCase();
      const vl = val.toLowerCase();
      switch (op) {
        case ':': return txt.includes(vl);
        case '=': return txt === vl;
        case '!=': return txt !== vl;
        case '^=': return txt.startsWith(vl);
        case '$=': return txt.endsWith(vl);
      }
    }
    throw new Error('Invalid syntax');
  }
  // FALLBACK: whole-word match on description
  const txt = String(txn.description||'').toLowerCase();
  const term = token.toLowerCase();
  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`);
  return pattern.test(txt);
}

/**
 * Filters an array of transactions by a Boolean+field query.
 * @param {Array<Object>} transactions
 * @param {string} query
 * @returns {Array<Object>}
 * @throws {Error} "Mismatched parentheses" or "Invalid syntax"
 */
export function filterTransactionsByBooleanQuery(transactions, query) {
  if (!query.trim()) return transactions;
  const tokens = tokenize(query);
  const rpn = toRPN(tokens);
  return transactions.filter((txn) => {
    const stack = [];
    for (const t of rpn) {
      const up = t.toUpperCase();
      if (OPS[up]) {
        if (up === 'NOT') {
          if (stack.length < 1) throw new Error('Invalid syntax');
          stack.push(!stack.pop());
        } else {
          if (stack.length < 2) throw new Error('Invalid syntax');
          const b = stack.pop(), a = stack.pop();
          stack.push(up === 'AND' ? a && b : a || b);
        }
      } else {
        stack.push(evalToken(t, txn));
      }
    }
    if (stack.length !== 1) throw new Error('Invalid syntax');
    return stack[0];
  });
}
