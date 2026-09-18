# Tech Agrovet — Stock Management System

A clean, full-stack agrovet stock management system built with **Node.js, Express, MongoDB** and a vanilla **HTML/CSS/JS** admin frontend. Includes **PWA support** with full offline caching via a service worker.

## Features

- Admin authentication (JWT)
- Inventory management with cost/selling prices
- POS-style sales (cart + checkout)
- Auto-generated receipts (view & print)
- Profit & Loss tracking per sale
- Dashboard with revenue/profit stats
- Low stock alerts
- Refunds with automatic stock restoration
- Paystack-ready payment field
- **PWA**: installable, offline app shell, cached API reads, cached static assets
- **SVG icon system** (no emojis)

## Getting Started

```bash
npm install
cp .env.example .env
# edit .env with your MongoDB URI and JWT secret
npm run dev# agrovet
