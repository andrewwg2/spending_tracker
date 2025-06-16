import { describe, it, expect } from 'vitest'
import { categorizeTransactions, summarizeByCategory, filterTransactionsByBooleanQuery } from '../src/analysis.js'

// Helper to generate transaction objects
const makeTxn = (desc, amount = 10) => ({ id: 't1', date: '2025-01-01', description: desc, amount })

describe('categorizeTransactions - basic and add-category', () => {
  const baseDict = {
    Gas: ['shell', 'chevron'],
    Coffee: ['starbucks', 'latte'],
  }

  it('categorizes without conflicts', () => {
    const txns = [makeTxn('Bought coffee latte'), makeTxn('Filled shell tank')]
    const result = categorizeTransactions(txns, baseDict)
    expect(result[0].category).toBe('Coffee')
    expect(result[1].category).toBe('Gas')
  })

  it('falls back to Uncategorized when no match', () => {
    const txns = [makeTxn('Unknown merchant')]
    const result = categorizeTransactions(txns, baseDict)
    expect(result[0].category).toBe('Uncategorized')
  })

  it('recognizes newly added category and keyword', () => {
    const dict = { ...baseDict, Restaurant: ['tacoBell'] }
    const txns = [makeTxn('Dinner at tacoBell')]
    const result = categorizeTransactions(txns, dict)
    expect(result[0].category).toBe('Restaurant')
  })
})

describe('categorizeTransactions - conflict resolution', () => {
  it('resolves equal single-keyword conflict by insertion order', () => {
    const dict = { Groceries: ['joe'], Coffee: ['joe'] }
    const txns = [makeTxn('joe')]
    const result = categorizeTransactions(txns, dict)
    expect(result[0].category).toBe('Groceries')
  })

  it('resolves by most keyword hits when counts differ', () => {
    const dict = {
      Groceries: ['joe', 'market'],
      Coffee: ['joe']
    }
    const txns = [makeTxn('joe market')]
    const result = categorizeTransactions(txns, dict)
    expect(result[0].category).toBe('Groceries')
  })

  it('uses categorey name if no keywords', () => {
    const dict = { Groceries: ['apple'], Produce: ['banana'] }
    const txns = [makeTxn('Bought some produce')]
    const result = categorizeTransactions(txns, dict, { nameThreshold: 0.3 })
    expect(result[0].category).toBe('Produce')
  })

    it('keywords same and category name present', () => {
    const dict = {  Produce: ['apple'], Groceries: ['apple'], }
    const txns = [makeTxn('Bought some apples at the groceries store')]
    const result = categorizeTransactions(txns, dict, { nameThreshold: 0.3 })
    expect(result[0].category).toBe('Groceries')
      })
    it('keywords conflict testing list order precedence', () => {
    const dict = {  Produce: ['apple'], Groceries: ['banana'], }
    const txns = [makeTxn('Bought some apples and bananas')]
    const result = categorizeTransactions(txns, dict, { nameThreshold: 0.3 })
    expect(result[0].category).toBe('Produce')
  })
})


describe('summarizeByCategory', () => {
  it('sums amounts correctly', () => {
    const categorized = [
      { category: 'A', amount: 5.5 },
      { category: 'A', amount: '4.5' },
      { category: 'B', amount: 3 }
    ]
    const summary = summarizeByCategory(categorized)
    expect(summary).toEqual({ A: 10, B: 3 })
  })
})

describe('filterTransactionsByBooleanQuery', () => {
  const txns = [
    makeTxn('starbucks coffee'),
    makeTxn('latte drink'),
    makeTxn('shell gas')
  ]

  it('filters single term', () => {
    const res = filterTransactionsByBooleanQuery(txns, 'latte')
    expect(res).toHaveLength(1)
    expect(res[0].description).toContain('latte')
  })

  it('handles AND operator', () => {
    const res = filterTransactionsByBooleanQuery(txns, 'starbucks AND coffee')
    expect(res).toHaveLength(1)
  })

  it('handles OR operator', () => {
    const res = filterTransactionsByBooleanQuery(txns, 'latte OR shell')
    expect(res).toHaveLength(2)
  })

  it('handles NOT operator', () => {
    const res = filterTransactionsByBooleanQuery(txns, 'NOT gas')
    expect(res).toHaveLength(2)
  })
})
