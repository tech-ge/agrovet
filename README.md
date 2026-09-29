# Karen Agrovet — Stock Management System

A clean, full-stack agrovet stock management system built with **Node.js, Express, MongoDB** and a vanilla **HTML/CSS/JS** admin frontend. Includes **PWA support** with full offline caching via a service worker.

## Features

- Role-based accounts: admin, staff, and customer
- Customers browse available stock and submit sale requests
- Staff process requests, apply discounts, and record stock purchases
- Purchase entries update average buying cost and retain supplier, reference, date, and quantity details
- Admin-only product pricing, account management, purchase history, and profit reporting
- POS-style sales and auto-generated receipts (view & print)
- Profit & Loss tracking per sale
- Dashboard with revenue/profit stats
- Low stock alerts
- Refunds with automatic stock restoration
- Paystack-ready payment field
- **PWA**: installable, offline app shell and cached static assets; authenticated API data is not cached
- **SVG icon system** (no emojis)

## Getting Started

```bash
npm install
cp .env.example .env
# edit .env with your MongoDB URI and JWT secret
npm run dev# agrovet
