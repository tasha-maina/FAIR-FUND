# Fair Fund

Fair credit for every Kenyan. Fair Fund is a fintech loan platform that evaluates applicants using a transparent credit scoring engine and moves money entirely through M-Pesa, from evaluation fee collection to final disbursement.

## What it does

A user registers, submits a loan application, and instantly receives a credit score built from four weighted factors: employment status, income stability, repayment history, and loan amount reasonableness. Based on the score, a risk level is assigned and a proportional evaluation fee (5 percent of the requested loan) is calculated. The user pays that fee through M-Pesa STK Push. Once payment clears, the application moves into review, where an admin can approve or reject it with a note. Approved loans are disbursed directly to the applicant's phone using the M-Pesa B2C API.

## Tech stack

**Frontend:** React (Vite), React Router
**Backend:** Node.js, Express
**Database:** PostgreSQL
**Auth:** JWT, bcrypt
**Payments:** M-Pesa Daraja API (STK Push for collections, B2C for disbursement)
**Hosting (planned):** Vercel (client), Railway (server and database)

## Project structure

FAIR-FUND/
├── client/             React frontend (Vite)
│   └── src/
│       ├── pages/      Landing, Register, Login, Dashboard, AdminDashboard
│       ├── components/ Navbar, ProtectedRoute
│       ├── context/    AuthContext
│       └── api/        Axios instance with JWT interceptor
└── server/             Express backend
    ├── routes/         auth, applications, mpesa
    ├── middleware/      JWT auth guard
    ├── utils/          Credit scoring engine, M-Pesa security credential
    ├── scripts/        Standalone test scripts
    └── certs/          M-Pesa sandbox certificate 
\```

## Core features

- User registration and login with JWT-based sessions
- Loan application submission tied to the authenticated user
- Credit scoring engine that scores employment, income stability, repayment history, and loan size out of 100, with a low, medium, or high risk classification
- Evaluation fee calculated as 5 percent of the requested loan amount, scaling fairly with loan size
- M-Pesa STK Push integration for evaluation fee payment, with callback handling that updates application status automatically
- Admin review endpoint to approve or reject applications with notes
- M-Pesa B2C disbursement for approved loans

## Database schema

Six core tables: `users`, `loan_applications`, `credit_scores`, `evaluation_fees`, `loan_offers`, and `repayments`, linked by foreign keys to track a loan from application through disbursement and repayment.

## Setup

### Backend
cd server
npm install

Create a `.env` file in `server/`:

Run migrations and start the server:

node migrations.js
npm run dev

### Frontend

cd client
npm install
npm run dev

The client runs on `http://localhost:5173` and the server on `http://localhost:5000`.

## Roadmap

- Complete the React frontend (applicant dashboard, admin dashboard)
- Move M-Pesa credentials to production once sandbox testing is complete
- Add audit logging for admin actions and M-Pesa callbacks
- Deploy backend to Railway and frontend to Vercel

## Author

Built by Natasha Maina.
