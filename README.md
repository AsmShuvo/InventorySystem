# Sneaker Drop — Real-Time Inventory System

## Overview

Sneaker Drop is a real-time, high-traffic inventory system designed to handle
limited-quantity product launches ("drops"). It models reservations, stock
availability, and purchases under load, with live updates pushed to clients
over WebSockets.

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, Prisma (PostgreSQL)
- **Frontend**: React, Vite, Tailwind CSS, axios, socket.io-client, react-hot-toast
- **Database**: PostgreSQL (any provider; configured via `DATABASE_URL`)

## How to Run

> _Placeholder — full run instructions will be added once feature work begins._

Rough outline:

1. Backend
   - `cd Backend`
   - Copy `.env.example` to `.env` and fill in `DATABASE_URL`
   - `npm install`
   - `npm run db:generate`
   - `npm run db:migrate` (first time only)
   - `npm run dev`
2. Frontend
   - `cd Frontend`
   - Copy `.env.example` to `.env`
   - `npm install`
   - `npm run dev`

## Architecture Notes

> _Placeholder — to be expanded._

- Reservations decrement available stock and expire on a timer, releasing
  inventory back into the pool.
- Stock changes broadcast to all connected clients via Socket.io so the UI
  reflects real availability without polling.
- Prisma is the single source of truth for the schema; migrations live in
  `Backend/prisma/migrations`.
