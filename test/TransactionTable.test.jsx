/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, test, expect, vi } from 'vitest'
import TransactionTable from '../src/TransactionTable.jsx'

describe('TransactionTable', () => {
  const sampleTxns = [
    {
      id: 'abc-1',
      date: '2025-03-15',
      description: 'Whole Foods',
      category: 'Groceries',
      amount: 75.0
    }
  ]

  test('renders a single row and allows editing', async () => {
    const onUpdateTxn = vi.fn()
    const onDeleteTxn = vi.fn()

    render(
      <TransactionTable
        transactions={sampleTxns}
        onUpdateTxn={onUpdateTxn}
        onDeleteTxn={onDeleteTxn}
      />
    )

    // Verify initial render (non-edit mode)
    expect(screen.getByText('2025-03-15')).toBeInTheDocument()
    expect(screen.getByText('Whole Foods')).toBeInTheDocument()
    // The displayed (non-input) amount is “75.00”
    expect(screen.getByText('75.00')).toBeInTheDocument()

    // Click “Edit”
    fireEvent.click(screen.getByText('Edit'))

    // Now the inputs should appear. The date input is “2025-03-15”
    const dateInput = screen.getByDisplayValue('2025-03-15')
    expect(dateInput).toBeInTheDocument()

    // The description input is “Whole Foods”
    const descInput = screen.getByDisplayValue('Whole Foods')
    expect(descInput).toBeInTheDocument()

    // The amount input is initialized as the string "75" (not "75.00")
    const amountInput = screen.getByDisplayValue('75')
    expect(amountInput).toBeInTheDocument()

    // Change the amount to “80”
    fireEvent.change(amountInput, { target: { value: '80' } })

    // Click “Save”
    fireEvent.click(screen.getByText('Save'))

    // Confirm that onUpdateTxn was called with the updated object
    await waitFor(() => {
      expect(onUpdateTxn).toHaveBeenCalledWith({
        id: 'abc-1',
        date: '2025-03-15',         // unchanged
        description: 'Whole Foods', // unchanged
        category: 'Groceries',      // unchanged
        amount: 80.0
      })
    })
  })

  test('clicking Delete calls onDeleteTxn with the correct id', () => {
    const onUpdateTxn = vi.fn()
    const onDeleteTxn = vi.fn()

    render(
      <TransactionTable
        transactions={sampleTxns}
        onUpdateTxn={onUpdateTxn}
        onDeleteTxn={onDeleteTxn}
      />
    )

    // Click Delete
    fireEvent.click(screen.getByText('Delete'))
    expect(onDeleteTxn).toHaveBeenCalledWith('abc-1')
  })
})
