// tests/dataLoader.test.js
import { describe, it, expect } from 'vitest'
import { parseCsvFile } from '../src/dataLoader.js'

describe('parseCsvFile', () => {
  function makeFile(content) {
    return new File([content], 'test.csv', { type: 'text/csv' })
  }

  it('parses CSV into objects with correct types', async () => {
    const csv = `date,description,amount
2025-01-01,Test Expense,123.45`
    const result = await parseCsvFile(makeFile(csv))
    expect(result).toEqual([
      { date: '2025-01-01', description: 'Test Expense', amount: 123.45 }
    ])
  })

  it('trims whitespace and handles empty values', async () => {
    const csv = `a,b,c
  1 , foo , 
2, bar,3`
    const data = await parseCsvFile(makeFile(csv))
    expect(data).toEqual([
      { a: 1, b: 'foo', c: '' },
      { a: 2, b: 'bar', c: 3 }
    ])
  })

  it('rejects invalid input with “Failed to read file”', async () => {
    await expect(parseCsvFile({})).rejects.toThrow('Failed to read file')
  })
})