# AI-Powered Smart Library Management System

A full-stack, enterprise-grade Smart Library Management System built with **React.js**, **Node.js/Express.js**, and **MySQL**, enhanced with three intelligent AI features:

1. **AI-Powered Book Search & Recommendation System** (natural language intent, semantic topic matching, live MySQL stock ranking, and keyword fallback).
2. **AI Library Chatbot** (floating responsive conversational assistant grounded strictly in verified MySQL catalogue and student loan records, handling policy queries and edge cases).
3. **AI Borrowing Status Assistant & Authorized Circulation Desk** (student borrowing inquiry, status calculation [Issued, Returned, Overdue, Due Soon], RBAC student privacy protection, atomic double-return prevention, and live stock synchronization).

---

## Architecture Overview

```
smart-library-system/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL connection pool & automatic table initialization
│   ├── controllers/
│   │   ├── authController.js     # User authentication, JWT tokens, student directory
│   │   ├── bookController.js     # Book catalogue queries, details, category/author filters
│   │   ├── chatController.js     # Grounded AI chatbot query processing
│   │   └── loanController.js     # Student loans, status metrics, librarian issue/return
│   ├── database/
│   │   ├── schema.sql            # MySQL table DDL (users, books, transactions)
│   │   └── seed.js               # Database migration & realistic initial dataset
│   ├── middleware/
│   │   └── auth.js               # JWT verification & Librarian RBAC authorization guard
│   ├── routes/
│   │   ├── aiRoutes.js           # /api/ai/books/search, /api/ai/chat (rate-limited)
│   │   ├── authRoutes.js         # /api/auth/login, /api/auth/me, /api/auth/students
│   │   ├── bookRoutes.js         # /api/books, /api/books/filters, /api/books/:id
│   │   └── loanRoutes.js         # /api/loans/my, /api/loans/my/status, /api/loans/:id/return
│   ├── services/
│   │   ├── aiService.js          # Modular AI service (Gemini API + deterministic fallback)
│   │   ├── loanService.js        # Transaction business logic, date calculations & MySQL atomic rollback
│   │   └── searchService.js      # Natural language intent parser & relevance scoring engine
│   ├── test/
│   │   ├── test-all.js           # Unit & module integration test suite (18 test cases)
│   │   └── test-e2e-http.js      # HTTP end-to-end integration & RBAC security test suite (12 test cases)
│   ├── .env                      # Active environment configuration
│   ├── .env.example              # Template environment configuration
│   ├── package.json              # Backend dependencies
│   └── server.js                 # Express server with unified API and static frontend serving
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── BookCard.jsx            # Book presentation card with live MySQL availability badge
    │   │   ├── BookDetailModal.jsx     # Detailed book modal with synopsis and metadata
    │   │   ├── Chatbot.jsx             # Floating, responsive AI assistant with suggested questions
    │   │   ├── LibrarianDashboard.jsx  # Librarian circulation desk (Verify & Return, Issue Book)
    │   │   ├── Navbar.jsx              # Header with brand and one-click Student/Librarian persona switcher
    │   │   ├── SearchBar.jsx           # Natural language AI search bar with filter chips
    │   │   └── StudentLoans.jsx        # Student borrowing status view (Active, Due Soon, Overdue)
    │   ├── context/
    │   │   └── AuthContext.jsx         # React authentication & user session state
    │   ├── services/
    │   │   └── api.js                  # Axios client with JWT interceptor
    │   ├── App.css                     # Responsive design, animations, hover states
    │   ├── App.jsx                     # Single page application coordinating tabs
    │   └── main.jsx                    # React entry point
    ├── index.html                      # HTML template with Bootstrap 5
    ├── package.json                    # Frontend dependencies
    └── vite.config.js                  # Vite bundler & API proxy configuration
```

---

## Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8+ or v9+) running locally on default port 3306 or socket `/tmp/mysql.sock`

### 1. Database Setup & Seeding
From the `backend/` directory:
```bash
cd backend
npm install
node database/seed.js --clean
```
This initializes the database `smart_library`, verifies tables (`users`, `books`, `transactions`), and loads the catalogue with Python, Java, AI, DBMS, Web Development, and Cloud Computing books.

### 2. Running the Application

#### Option A: Unified Server (Frontend + Backend on Port 5001)
The backend is configured to serve the production frontend build directly:
```bash
cd backend
npm start
```
Open **`http://localhost:5001`** in your browser.

#### Option B: Development Mode (Vite Hot-Reload on Port 3000)
1. In terminal 1 (Backend):
   ```bash
   cd backend
   npm start
   ```
2. In terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```
Open **`http://localhost:3000`** in your browser.

---

## Pre-Configured Test Personas

Use the **"Switch Persona"** dropdown in the top navbar to instantly test different roles:

| Persona | Role | Username | Password | Student ID | Scenarios to Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Santhosh Krishnaa** | Student | `santhosh` | `password123` | `24BCS245` | Has an active Java book (due today), an overdue DBMS book, and an active Python book. |
| **Parthiban V P** | Student | `parthiban` | `password123` | `24BCS199` | Has an overdue Machine Learning book and an active Web Development book. Demonstrates student privacy (cannot see Santhosh's loans). |
| **Mrs. Lakshmi** | Librarian | `librarian` | `adminpassword` | *N/A* | Authorized circulation counter staff: verify physical returns, update live MySQL records, issue books. |

---

## AI Configuration & Grounding Safety

The system uses a **safe, modular AI service** (`backend/services/aiService.js`).

### AI Environment Variables (`backend/.env`):
```env
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-1.5-flash
```

### Fallback Guarantee:
- If `AI_API_KEY` is not provided or the network is offline, the application **automatically switches to its deterministic grounded NLP engine**.
- Core library functions, book searching, loan lookups, and circulation workflows **never break or require a paid API key**.
- Availability is **always retrieved live from MySQL**, never hallucinated or generated by AI models.

---

## Test Execution

### 1. Unit & Domain Integration Tests (18 test cases)
```bash
cd backend
node test/test-all.js
```
Verifies:
- Title, author, category, and natural-language searches.
- Empty query handling and MySQL availability consistency.
- Chatbot policy answers and verbal claim refusal.
- Student borrowing status calculation and privacy isolation.
- Librarian atomic returns, MySQL stock increment, double-return prevention, and chatbot live reflection.

### 2. End-to-End HTTP & RBAC Security Tests (12 test cases)
```bash
cd backend
node test/test-e2e-http.js
```
Verifies:
- Live HTTP endpoints (`/api/health`, `/api/auth/login`, `/api/ai/books/search`, `/api/ai/chat`, `/api/loans/my`, `/api/loans/:id/return`).
- Role-based authorization: verifying student token receives `403 Forbidden` on librarian endpoints.
- Atomic return updates and duplicate return rejection (`400 Bad Request`).

