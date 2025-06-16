# Spending Tracker App

A React-based expense tracker that categorizes transactions using keyword dictionaries and supports fuzzy matching, CSV uploads, advanced filtering, and dynamic category management.

## Features

- Keyword-based automatic categorization with fuzzy name resolution
- Inline editing and deletion of transactions
- CSV upload support with bulk import handling
- Boolean query filtering (supports `AND`, `OR`, `NOT`)
- Summary view by category
- Add new categories and keywords via modal interface
- LocalStorage persistence
- Dockerized for easy development and testing

---

## Running in Docker

### Build the Docker image

```bash
. build_docker.sh spending_tracker
````

---

## Run Tests with Coverage

```bash
. build_docker.sh spending_categories && docker run --rm spending_categories ./run_tests.sh
```

This runs the test suite with coverage using:

```bash
#!/bin/sh

export CI=true
npm run coverage
```

---

## Run in Development Mode

```bash
. build_docker.sh spending_tracker && docker run --rm -it -p 5173:5173 spending_tracker ./run_dev.sh
```

This runs the app in development mode and binds it to `localhost:5173`.

```bash
#!/bin/sh

export CI=true
npm run dev -- --host 0.0.0.0
```

---

## Project Structure

```
src/
├── App.jsx                # Main application logic and UI
├── analysis.js            # Categorization, filtering, and summarization logic
├── dataLoader.js          # CSV parsing logic
├── TransactionTable.jsx   # Table for displaying and editing transactions
├── SummaryTable.jsx       # Category total summaries
```

---

## Requirements

* Docker
* Node.js and npm (inside Docker only)
* CSV file with headers: `date`, `description`, `amount`

---

## Notes

* Transactions and category dictionary are stored in browser `localStorage`
* To reset data, clear localStorage or rebuild with a fresh state
* Modals and core logic are designed for easy unit testing

---

## License

MIT – use it, modify it, share it.
