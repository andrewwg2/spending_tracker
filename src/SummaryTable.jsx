import React from 'react'

export default function SummaryTable({ summary }) {
  return (
    <table className="min-w-full table-auto border-collapse mt-4">
      <thead>
        <tr>
          <th className="border px-2 py-1">Category</th>
          <th className="border px-2 py-1">Total</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(summary).map(([cat, total]) => (
          <tr key={cat}>
            <td className="border px-2 py-1">{cat}</td>
            <td className="border px-2 py-1">
              ${total.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
