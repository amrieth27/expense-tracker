# Ledger — Personal Finance & Monthly Budget Tracker

A MERN application for recording income and expenses, setting category budgets, and reviewing monthly spending in charts.

## Requirements

- Node.js 18+
- MongoDB 7+ locally (or a MongoDB Atlas connection string)
- Docker Desktop is optional if you want to run the included MongoDB Compose service

## Start MongoDB DataBase

In a terminal:

```sh
cd database
docker compose up -d
```

Alternatively, run your own MongoDB server and point `MONGODB_URI` to it.

## Start the backend

Open a second terminal:

```sh
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

The API runs at `http://localhost:5000`. Configure `MONGODB_URI`, `PORT`, and `CLIENT_ORIGIN` in `backend/.env` if needed.

## Start the frontend

Open a third terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).
The frontend uses `http://localhost:5000/api` by default. To change it, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

On macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`. For a production frontend build, run `npm run build` from `frontend`.
