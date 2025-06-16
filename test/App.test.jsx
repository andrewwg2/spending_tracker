/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, test, beforeEach, afterEach, expect, vi } from 'vitest'

import App from '../src/App.jsx'
import * as dataLoader from '../src/dataLoader.js'
import * as analysis from '../src/analysis.js'

describe('App – boolean-query integration', () => {
  const dummyTxns = [
    { date: '2025-01-01', description: 'Shell Station', amount: 45.23 },
    { date: '2025-01-02', description: 'Starbucks Coffee', amount: 5.75 }
  ]

  beforeEach(() => {
    // Stub parseCsvFile
    vi.spyOn(dataLoader, 'parseCsvFile').mockResolvedValue(dummyTxns)

    // Stub categorizeTransactions: “Shell” => “Gas”; otherwise “Coffee”
    vi.spyOn(analysis, 'categorizeTransactions').mockImplementation((txns) =>
      txns.map((t) => ({
        ...t,
        category: t.description.includes('Shell') ? 'Gas' : 'Coffee'
      }))
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters transactions when typing a boolean query', async () => {
    const { container } = render(<App />)

    // 1) Upload the dummy CSV
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()

    await userEvent.upload(
      fileInput,
      new File(['ignored'], 'dummy.csv', { type: 'text/csv' })
    )

    // 2) Wait until both categories appear in row + summary
    await waitFor(() => {
      expect(screen.getAllByText('Gas')).toHaveLength(2)
      expect(screen.getAllByText('Coffee')).toHaveLength(2)
    })

    // 3) Type a boolean query that excludes “Shell”
    const search = screen.getByPlaceholderText(/Search \(AND, OR, NOT\)/i)
    await userEvent.clear(search)
    await userEvent.type(search, 'Coffee AND NOT shell')

    // 4) Now “Gas” should be completely gone, and one “5.75” (the Starbucks row) should remain
    await waitFor(() => {
      expect(screen.queryAllByText('Gas')).toHaveLength(0)

      // Only the Starbucks row itself—no extra “5.75” in the summary 
      // (adjust this if your summary renders differently).
      const occurrences = screen.getAllByText('5.75')
      expect(occurrences).toHaveLength(1)
    })
  })
})

describe('Expense Tracker: LocalStorage & Editing', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads transactions from localStorage on mount', () => {
    const fakeTransactions = [
      {
        id: '123-0',
        date: '2025-06-01',
        description: 'Shell gas station',
        category: 'Gas',
        amount: 42.5
      },
      {
        id: '124-1',
        date: '2025-06-02',
        description: "Trader Joe's",
        category: 'Groceries',
        amount: 88.13
      }
    ]
    window.localStorage.setItem('spendingTxns', JSON.stringify(fakeTransactions))

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<App />)

    expect(screen.getByText('2025-06-01')).toBeInTheDocument()
    expect(screen.getByText('Shell gas station')).toBeInTheDocument()
    expect(screen.getByText('42.50')).toBeInTheDocument()

    expect(screen.getByText('2025-06-02')).toBeInTheDocument()
    expect(screen.getByText("Trader Joe's")).toBeInTheDocument()
    expect(screen.getByText('88.13')).toBeInTheDocument()

    expect(logSpy).toHaveBeenCalledWith(
      '[App] Loaded transactions from localStorage:',
      fakeTransactions
    )
  })

  it('saves edited transaction back to localStorage', async () => {
    const fakeTransactions = [
      {
        id: '555-0',
        date: '2025-06-10',
        description: 'Starbucks coffee',
        category: 'Coffee',
        amount: 5.75
      }
    ]
    window.localStorage.setItem('spendingTxns', JSON.stringify(fakeTransactions))

    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    render(<App />)

    const editButton = await screen.findByText('Edit')
    expect(editButton).toBeInTheDocument()

    fireEvent.click(editButton)

    const amountInput = screen.getByDisplayValue('5.75')
    fireEvent.change(amountInput, { target: { value: '6.00' } })

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('6.00')).toBeInTheDocument()
    })

    const savedArg = JSON.parse(window.localStorage.getItem('spendingTxns'))
    expect(savedArg).toEqual([
      {
        id: '555-0',
        date: '2025-06-10',
        description: 'Starbucks coffee',
        category: 'Coffee',
        amount: 6.0
      }
    ])

    expect(setItemSpy).toHaveBeenCalledWith(
      'spendingTxns',
      JSON.stringify([
        {
          id: '555-0',
          date: '2025-06-10',
          description: 'Starbucks coffee',
          category: 'Coffee',
          amount: 6.0
        }
      ])
    )
  })

  it('editing date and description also persists to LocalStorage', async () => {
    const fakeTransactions = [
      {
        id: '777-0',
        date: '2025-05-20',
        description: 'Kroger grocery',
        category: 'Groceries',
        amount: 120.0
      }
    ]
    window.localStorage.setItem('spendingTxns', JSON.stringify(fakeTransactions))
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    render(<App />)

    fireEvent.click(await screen.findByText('Edit'))

    const dateInput = screen.getByDisplayValue('2025-05-20')
    fireEvent.change(dateInput, { target: { value: '2025-05-21' } })

    const descInput = screen.getByDisplayValue('Kroger grocery')
    fireEvent.change(descInput, { target: { value: 'Kroger Market' } })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('2025-05-21')).toBeInTheDocument()
      expect(screen.getByText('Kroger Market')).toBeInTheDocument()
    })

    const savedArg = JSON.parse(window.localStorage.getItem('spendingTxns'))
    expect(savedArg).toEqual([
      {
        id: '777-0',
        date: '2025-05-21',
        description: 'Kroger Market',
        category: 'Groceries',
        amount: 120.0
      }
    ])
    expect(setItemSpy).toHaveBeenCalled()
  })

  it('deleting a row removes it from state and localStorage', async () => {
    const fakeTransactions = [
      {
        id: '888-0',
        date: '2025-07-01',
        description: 'Almond latte',
        category: 'Coffee',
        amount: 4.5
      }
    ]
    window.localStorage.setItem('spendingTxns', JSON.stringify(fakeTransactions))
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    render(<App />)

    fireEvent.click(await screen.findByText('Delete'))

    await waitFor(() => {
      expect(screen.queryByText('Almond latte')).not.toBeInTheDocument()
    })

    const savedArg = JSON.parse(window.localStorage.getItem('spendingTxns'))
    expect(savedArg).toEqual([])
    expect(setItemSpy).toHaveBeenCalledWith('spendingTxns', JSON.stringify([]))
  })
})


describe('App – recategorization on edit', () => {
  beforeEach(() => {
    // Seed localStorage with one Gas transaction
    const txns = [
      { id: '1', date: '2025-01-01', description: 'Shell station', category: 'Gas', amount: 20 }
    ]
    localStorage.setItem('spendingTxns', JSON.stringify(txns))
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('recalculates category when description is edited', async () => {
    render(<App />)

    // 1) Locate the original description cell and its row
    const oldDesc = await screen.findByText('Shell station')
    const row     = oldDesc.closest('tr')
    expect(row).toBeTruthy()
    // confirm initial category
    expect(within(row).getByText('Gas')).toBeInTheDocument()

    // 2) Enter edit mode
    fireEvent.doubleClick(oldDesc)

    // 3) Change the description to trigger Coffee category
    const input = within(row).getByDisplayValue('Shell station')
    fireEvent.change(input, { target: { value: 'Starbucks downtown' } })

    // 4) Click Save
    fireEvent.click(within(row).getByText('Save'))

    // 5) Wait for new description to render, then assert new category
    const newDesc = await screen.findByText('Starbucks downtown')
    const newRow  = newDesc.closest('tr')
    expect(newRow).toBeTruthy()
    expect(within(newRow).getByText('Coffee')).toBeInTheDocument()
  })
})
