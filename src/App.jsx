// src/App.jsx
// Version 2.0 - Refactored for efficiency and testability

import React, { useState, useMemo, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { parseCsvFile } from './dataLoader.js'
import {
  categorizeTransactions,
  summarizeByCategory,
  filterTransactionsByBooleanQuery
} from './analysis.js'
import TransactionTable from './TransactionTable.jsx'
import SummaryTable from './SummaryTable.jsx'

// Modal Components (keeping them in the same file as requested)
const AddEntryModal = ({ show, entry, onEntryChange, onSave, onCancel }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">New Transaction</h2>
        {/* Date */}
        <label className="block mb-3">
          <span className="block text-sm mb-1">Date</span>
          <input
            type="date"
            value={entry.date}
            onChange={e => onEntryChange({ ...entry, date: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        {/* Description */}
        <label className="block mb-3">
          <span className="block text-sm mb-1">Description</span>
          <input
            type="text"
            value={entry.description}
            onChange={e => onEntryChange({ ...entry, description: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        {/* Amount */}
        <label className="block mb-6">
          <span className="block text-sm mb-1">Amount</span>
          <input
            type="number"
            step="0.01"
            value={entry.amount}
            onChange={e => onEntryChange({ ...entry, amount: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const CategorizeModal = ({ 
  show, 
  transaction, 
  keyword, 
  selectedCategory, 
  newCategoryName,
  dictionary,
  onKeywordChange,
  onCategoryChange,
  onNewCategoryChange,
  onSave,
  onCancel 
}) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {transaction ? `Categorize: ${transaction.description}` : 'Add New Category'}
        </h2>
        {/* Keyword */}
        <label className="block mb-3">
          <span className="block text-sm mb-1">Keyword</span>
          <input
            type="text"
            value={keyword}
            onChange={e => onKeywordChange(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </label>
        {/* Existing Category */}
        <label className="block mb-3">
          <span className="block text-sm mb-1">Existing Category</span>
          <select
            value={selectedCategory}
            onChange={e => onCategoryChange(e.target.value)}
            className="w-full p-2 border rounded-lg mb-2"
          >
            <option value="">-- Select --</option>
            {Object.keys(dictionary).map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        {/* New Category */}
        <label className="block mb-6">
          <span className="block text-sm mb-1">Or New Category</span>
          <input
            type="text"
            value={newCategoryName}
            onChange={e => onNewCategoryChange(e.target.value)}
            placeholder="Enter new category name"
            className="w-full p-2 border rounded-lg"
          />
        </label>
        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Extracted business logic functions for better testability
export const createTransaction = (data, index = 0) => ({
  id: `${Date.now()}-${index}`,
  date: data.date,
  description: data.description,
  amount: parseFloat(data.amount) || 0
});

export const processImportedTransactions = (rawData, dictionary) => {
  // Create all transactions first
  const transactions = rawData.map((r, i) => createTransaction(r, i));
  
  // Categorize all transactions in bulk
  const categorizedTxns = categorizeTransactions(transactions, dictionary);
  
  // Separate categorized and uncategorized in one pass
  const categorized = [];
  const uncategorized = [];
  
  categorizedTxns.forEach(txn => {
    if (txn.category === 'Uncategorized') {
      uncategorized.push(txn);
    } else {
      categorized.push(txn);
    }
  });
  
  return { categorized, uncategorized };
};

export const updateDictionary = (dictionary, keyword, selectedCategory, newCategoryName) => {
  const updated = { ...dictionary };
  let categoryName = selectedCategory;
  
  if (newCategoryName.trim()) {
    categoryName = newCategoryName.trim();
    updated[categoryName] = keyword.trim() ? [keyword.trim()] : [];
  } else if (selectedCategory && keyword.trim()) {
    updated[selectedCategory] = [...(updated[selectedCategory] || []), keyword.trim()];
  }
  
  return { updated, categoryName };
};

export const recategorizeTransaction = (transaction, dictionary) => {
  const recategorized = categorizeTransactions([transaction], dictionary)[0];
  return recategorized;
};

// Main App Component
export default function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ date: '', description: '', amount: '' })

  const [showCategorizeForm, setShowCategorizeForm] = useState(false)
  const [categorizeTxn, setCategorizeTxn] = useState(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')

  const isInitialMount = useRef(true)
  const pendingUncategorized = useRef([])

  const defaultDict = {
    Gas:       ['shell', 'exxon', 'chevron', 'bp'],
    Coffee:    ['starbucks', 'dunkin', 'peets'],
    Groceries: ['whole foods', 'trader joe', 'aldi', 'kroger'],
  }

  const [dictionary, setDictionary] = useState(() => {
    const saved = localStorage.getItem('spendingDict')
    return saved ? JSON.parse(saved) : defaultDict
  })

  // Keep dictionary in localStorage
  useEffect(() => {
    localStorage.setItem('spendingDict', JSON.stringify(dictionary))
  }, [dictionary])

  // Load saved transactions synchronously
  useLayoutEffect(() => {
    const raw = localStorage.getItem('spendingTxns')
    if (raw) {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          console.log('[App] Loaded transactions from localStorage:', arr)
          setTransactions(arr)
        }
      } catch (e) {
        console.error('[App] JSON.parse failed:', e)
      }
    }
  }, [])

  // Persist transactions after the first mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      try {
        localStorage.setItem('spendingTxns', JSON.stringify(transactions))
        console.log('[App] Saved transactions to localStorage:', transactions)
      } catch (e) {
        console.error('[App] Could not write to localStorage:', e)
      }
    }
  }, [transactions])

  // Process pending uncategorized transactions after categorization modal closes
  const processPendingTransactions = useCallback(() => {
    if (pendingUncategorized.current.length > 0) {
      const nextTxn = pendingUncategorized.current.shift();
      openCategorizeForm(nextTxn);
    }
  }, []);

  // CSV import - refactored for bulk processing
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    
    try {
      const raw = await parseCsvFile(file)
      const { categorized, uncategorized } = processImportedTransactions(raw, dictionary);
      
      // Add all categorized transactions in bulk
      if (categorized.length > 0) {
        setTransactions(prev => [...prev, ...categorized]);
      }
      
      // Queue uncategorized transactions for processing
      if (uncategorized.length > 0) {
        pendingUncategorized.current = uncategorized;
        openCategorizeForm(uncategorized[0]);
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dictionary]);

  // Add-entry form handlers
  const openAddForm = useCallback(() => {
    setNewEntry({ date: '', description: '', amount: '' });
    setShowAddForm(true);
  }, []);

  const saveNewEntry = useCallback(() => {
    const entry = createTransaction(newEntry);
    const categorized = recategorizeTransaction(entry, dictionary);
    
    if (categorized.category === 'Uncategorized') {
      openCategorizeForm(entry);
    } else {
      setTransactions(prev => [...prev, categorized]);
      setShowAddForm(false);
    }
  }, [newEntry, dictionary]);

  const cancelAdd = useCallback(() => setShowAddForm(false), []);

  // Categorize modal handlers
  const openCategorizeForm = useCallback((txn = null) => {
    setCategorizeTxn(txn);
    setNewKeyword('');
    setSelectedCategory('');
    setNewCategoryName('');
    setShowAddForm(false);
    setShowCategorizeForm(true);
  }, []);

  const saveCategorization = useCallback(() => {
    const { updated, categoryName } = updateDictionary(
      dictionary,
      newKeyword,
      selectedCategory,
      newCategoryName
    );
    
    setDictionary(updated);

    if (categorizeTxn) {
      // Update the specific transaction
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === categorizeTxn.id
            ? { ...tx, category: categoryName }
            : tx
        )
      );
      
      // Check if this was a pending transaction
      if (!transactions.find(tx => tx.id === categorizeTxn.id)) {
        // It's a new transaction from import
        setTransactions(prev => [...prev, { ...categorizeTxn, category: categoryName }]);
      }
    }
    
    setShowCategorizeForm(false);
    
    // Process next pending transaction if any
    processPendingTransactions();
  }, [dictionary, newKeyword, selectedCategory, newCategoryName, categorizeTxn, transactions, processPendingTransactions]);

  const cancelCategorization = useCallback(() => {
    setShowCategorizeForm(false);
    // Clear pending queue if user cancels
    pendingUncategorized.current = [];
  }, []);

  // Edit-save handler with recategorization
  const handleUpdateTxn = useCallback((updatedTxn) => {
    const recategorized = recategorizeTransaction(updatedTxn, dictionary);
    
    setTransactions(prev =>
      prev.map(tx => tx.id === recategorized.id ? recategorized : tx)
    );
    
    if (recategorized.category === 'Uncategorized') {
      openCategorizeForm(recategorized);
    }
  }, [dictionary, openCategorizeForm]);

  const handleDeleteTxn = useCallback((id) =>
    setTransactions(prev => prev.filter(tx => tx.id !== id)),
  []);

  // Filtering & summarizing
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

        {/* Controls */}
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

        {/* CSV Upload */}
        <label className="block mb-6">
          <span className="sr-only">Upload CSV</span>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="
              block w-full text-sm text-gray-700 bg-gray-50
              file:bg-blue-600 file:text-white file:font-semibold
              file:py-2 file:px-4 file:rounded-md hover:file:bg-blue-700
            "
          />
        </label>

        {/* Search */}
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

        {/* Add Entry Modal Component */}
        <AddEntryModal
          show={showAddForm}
          entry={newEntry}
          onEntryChange={setNewEntry}
          onSave={saveNewEntry}
          onCancel={cancelAdd}
        />

        {/* Categorize Modal Component */}
        <CategorizeModal
          show={showCategorizeForm}
          transaction={categorizeTxn}
          keyword={newKeyword}
          selectedCategory={selectedCategory}
          newCategoryName={newCategoryName}
          dictionary={dictionary}
          onKeywordChange={setNewKeyword}
          onCategoryChange={setSelectedCategory}
          onNewCategoryChange={setNewCategoryName}
          onSave={saveCategorization}
          onCancel={cancelCategorization}
        />
      </div>
    </div>
  )
}
