// src/TransactionTable.jsx
// Version 1.6030
import React, { useState } from 'react'

export default function TransactionTable({ transactions, onUpdateTxn, onDeleteTxn }) {
  
  const [editingId, setEditingId] = useState(null)
  
  const [editValues, setEditValues] = useState({
    date: '',
    description: '',
    amount: ''
  })

  // Click Edit, populate editValues and set editingId
  const startEdit = (txn) => {
    setEditingId(txn.id)
    setEditValues({
      date: txn.date,
      description: txn.description,
      amount: txn.amount.toString()
    })
  }

  // Update a specific field in editValues 
  const handleChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }))
  }

  // Click Save,  validate and propagate the updated transaction
  const saveEdit = (txn) => {
    const updatedDate = editValues.date.trim()
    const updatedDesc = editValues.description.trim()
    const updatedAmt = parseFloat(editValues.amount)

    // Basic validation: date must not be empty and amount must be a number
    if (!updatedDate || isNaN(updatedAmt)) {
      return
    }

    const updatedTxn = {
      ...txn,
      date: updatedDate,
      description: updatedDesc,
      amount: updatedAmt
    }

    onUpdateTxn(updatedTxn)
    setEditingId(null)
  }

  return (
    <div className="overflow-x-auto">
      {/* table-fixed + explicit column widths prevent shifting when editing */}
      <table className="w-full border-collapse table-fixed p-2">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-6 py-2 text-left">Date</th>
            <th className="px-6 py-2 text-left">Description</th>
            <th className="px-6 py-2 text-left">Category</th>
            <th className="px-6 py-2 text-right">Amount</th>
            <th className="px-6 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id} className="border-b">
              {/* DATE CELL */}
              <td className="px-4 py-2">
                {editingId === txn.id ? (
                  <input
                    type="date"
                    value={editValues.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full border rounded px-2 py-1"
                    autoFocus
                  />
                ) : (
                  <span onDoubleClick={() => startEdit(txn)}>
                    {txn.date}
                  </span>
                )}
              </td>

              {/* DESCRIPTION CELL */}
              <td className="px-6 py-2">
                {editingId === txn.id ? (
                  <input
                    type="text"
                    value={editValues.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                ) : (
                  <span onDoubleClick={() => startEdit(txn)}>
                    {txn.description}
                  </span>
                )}
              </td>

              {/* CATEGORY CELL (not directly editable here) */}
              <td className="px-6 py-2">
                {txn.category}
              </td>

              {/* AMOUNT CELL */}
              <td className="px-6 py-2 text-right">
                {editingId === txn.id ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-right"
                  />
                ) : (
                  <span onDoubleClick={() => startEdit(txn)}>
                    {txn.amount.toFixed(2)}
                  </span>
                )}
              </td>

              {/* ACTIONS CELL */}
              <td className="px-6 py-2 text-center">
                {editingId === txn.id ? (
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => saveEdit(txn)}
                      className="
                        text-sm text-white bg-green-600 hover:bg-green-700
                        px-2 py-1 rounded
                      "
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="
                        text-sm text-gray-500 hover:text-gray-700 bg-indigo-700
                        px-2 py-1 rounded
                      "
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <button
                      onClick={() => startEdit(txn)}
                      className="
                        mr-2 text-sm !bg-indigo-900 text-blue-100
                        hover:underline px-2 py-1 rounded
                      "
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteTxn(txn.id)}
                      className="
                        text-sm !border-slate-500 !bg-indigo-900 text-rose-300
                        hover:underline px-2 py-1 rounded
                      "
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
