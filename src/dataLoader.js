//src/dataLoader.js
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.trim().split('\n')
      const [headerLine, ...rows] = lines
      const keys = headerLine.split(',').map((h) => h.trim())
      const data = rows.map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const obj = {}
        keys.forEach((key, i) => {
          let val = values[i]
          if (val !== '' && !isNaN(val)) val = +val
          obj[key] = val
        })
        return obj
      })
      resolve(data)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    try {
      reader.readAsText(file)
    } catch {
      reject(new Error('Failed to read file'))
    }
  })
}