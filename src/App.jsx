// src/App.jsx
// Version 1.608D-refactored

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { parseCsvFile } from './dataLoader.js'
import {
  categorizeTransactions,
  summarizeByCategory,
  filterTransactionsByBooleanQuery
} from './analysis.js'
import TransactionTable from './TransactionTable.jsx'
import SummaryTable from './SummaryTable.jsx'

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const raw = localStorage.getItem('spendingTxns')
    try {
      const parsed = raw ? JSON.parse(raw) : []
      console.log('[App] Loaded transactions from localStorage:', parsed)
      return parsed
    } catch {
      return []
    }
  })

  const [dictionary, setDictionary] = useState(() => {
    const saved = localStorage.getItem('spendingDict')
    return saved ? JSON.parse(saved) : {
      Gas: ['shell', 'exxon', 'chevron', 'bp'],
      Coffee: ['starbucks', 'dunkin', 'peets'],
      Groceries: ['whole foods', 'trader joe', 'aldi', 'kroger'],
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [showCategorizeForm, setShowCategorizeForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ date: '', description: '', amount: '' })
  const [categorizeTxn, setCategorizeTxn] = useState(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    localStorage.setItem('spendingDict', JSON.stringify(dictionary))
  }, [dictionary])

  useEffect(() => {
    localStorage.setItem('spendingTxns', JSON.stringify(transactions))
  }, [transactions])

  const assignCategory = useCallback(
    (txn) => categorizeTransactions([txn], dictionary)[0],
    [dictionary]
  )

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const raw = await parseCsvFile(file)
      const txns = raw.map((r, i) => {
        const tx = {
          id: `${Date.now()}-${i}`,
          date: r.date,
          description: r.description,
          amount: parseFloat(r.amount) || 0
        }
        const cat = assignCategory(tx).category
        return { ...tx, category: cat }
      })
      const uncategorized = txns.find(tx => tx.category === 'Uncategorized')
      setTransactions(prev => [...prev, ...txns.filter(tx => tx.category !== 'Uncategorized')])
      if (uncategorized) openCategorizeForm(uncategorized)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openAddForm = () => {
    setNewEntry({ date: '', description: '', amount: '' })
    setShowAddForm(true)
  }

  const saveNewEntry = () => {
    const entry = {
      id: `${Date.now()}`,
      ...newEntry,
      amount: parseFloat(newEntry.amount) || 0
    }
    const cat = assignCategory(entry).category
    if (cat === 'Uncategorized') openCategorizeForm(entry)
    else {
      setTransactions(prev => [...prev, { ...entry, category: cat }])
      setShowAddForm(false)
    }
  }

  const openCategorizeForm = (txn = null) => {
    setCategorizeTxn(txn)
    setNewKeyword('')
    setSelectedCategory('')
    setNewCategoryName('')
    setShowAddForm(false)
    setShowCategorizeForm(true)
  }

  const saveCategorization = () => {
    const updated = { ...dictionary }
    let catName = selectedCategory
    if (newCategoryName.trim()) {
      catName = newCategoryName.trim()
      updated[catName] = newKeyword.trim() ? [newKeyword.trim()] : []
    } else if (selectedCategory && newKeyword.trim()) {
      updated[selectedCategory] = [...(updated[selectedCategory] || []), newKeyword.trim()]
    }
    setDictionary(updated)

    if (categorizeTxn) {
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === categorizeTxn.id ? { ...tx, category: catName } : tx
        )
      )
    }
    setShowCategorizeForm(false)
  }

  const handleUpdateTxn = (updatedTxn) => {
    const recat = assignCategory(updatedTxn).category
    const newTxn = { ...updatedTxn, category: recat }
    setTransactions(prev =>
      prev.map(tx => tx.id === newTxn.id ? newTxn : tx)
    )
    if (recat === 'Uncategorized') openCategorizeForm(newTxn)
  }

  const handleDeleteTxn = (id) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id))
  }

  const { filteredTxns, filterError } = useMemo(() => {
    if (!query.trim()) return { filteredTxns: transactions, filterError: '' }
    try {
      return {
        filteredTxns: filterTransactionsByBooleanQuery(transactions, query),
        filterError: ''
      }
    } catch (err) {
      return { filteredTxns: [], filterError: err.message }
    }
  }, [transactions, query])

  const filteredSummary = useMemo(
    () => summarizeByCategory(filteredTxns),
    [filteredTxns]
  )

  return (
    <div className="text-gray-700 min-h-screen flex items-center justify-center bg-gray-100 p-10">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-6">Expense Tracker</h1>

        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={openAddForm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add Entry
          </button>
          <button
            onClick={() => openCategorizeForm()}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Add Category
          </button>
        </div>

        <label className="block mb-6">
          <span className="sr-only">Upload CSV</span>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 bg-gray-50 file:bg-blue-600 file:text-white file:font-semibold file:py-2 file:px-4 file:rounded-md hover:file:bg-blue-700"
          />
        </label>

        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search (AND, OR, NOT)…"
          className="w-full mb-6 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading && <p className="mb-4 text-center">Loading…</p>}
        {error && <p className="text-red-600 mb-4 text-center">Error: {error}</p>}
        {filterError && <p className="text-red-500 mb-4 text-center">Filter error: {filterError}</p>}

        {transactions.length > 0 ? (
          <div className="space-y-8 overflow-x-auto">
            <TransactionTable
              transactions={filteredTxns}
              onUpdateTxn={handleUpdateTxn}
              onDeleteTxn={handleDeleteTxn}
            />
            <SummaryTable summary={filteredSummary} />
          </div>
        ) : (
          <p className="text-center text-gray-500">No transactions to display.</p>
        )}

        {showAddForm && (
          <AddEntryModal
            newEntry={newEntry}
            setNewEntry={setNewEntry}
            onCancel={() => setShowAddForm(false)}
            onSave={saveNewEntry}
          />
        )}

        {showCategorizeForm && (
          <CategorizeModal
            txn={categorizeTxn}
            newKeyword={newKeyword}
            setNewKeyword={setNewKeyword}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            dictionary={dictionary}
            onCancel={() => setShowCategorizeForm(false)}
            onSave={saveCategorization}
          />
        )}
      </div>
    </div>
  )
}

function AddEntryModal({ newEntry, setNewEntry, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">New Transaction</h2>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Date</span>
          <input
            type="date"
            value={newEntry.date}
            onChange={e => setNewEntry(ne => ({ ...ne, date: e.target.value }))}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Description</span>
          <input
            type="text"
            value={newEntry.description}
            onChange={e => setNewEntry(ne => ({ ...ne, description: e.target.value }))}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <label className="block mb-6">
          <span className="block text-sm mb-1">Amount</span>
          <input
            type="number"
            step="0.01"
            value={newEntry.amount}
            onChange={e => setNewEntry(ne => ({ ...ne, amount: e.target.value }))}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  )
}

function CategorizeModal({ txn, newKeyword, setNewKeyword, selectedCategory, setSelectedCategory, newCategoryName, setNewCategoryName, dictionary, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {txn ? `Categorize: ${txn.description}` : 'Add New Category'}
        </h2>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Keyword</span>
          <input
            type="text"
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Existing Category</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full p-2 border rounded-lg mb-2"
          >
            <option value="">-- Select --</option>
            {Object.keys(dictionary).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
        <label className="block mb-6">
          <span className="block text-sm mb-1">Or New Category</span>
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Enter new category name"
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  )
}
