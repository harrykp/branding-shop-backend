// branding-shop-backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Allow all origins so your GitHub Pages frontend (and any other client) can communicate
app.use(cors());
app.use(express.json());

// JWT auth middleware
const auth = require('./middleware/auth');

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes (all require a valid JWT)
app.use('/api/users',             auth, require('./routes/users'));
app.use('/api/roles',             auth, require('./routes/roles'));
app.use('/api/quotes',            auth, require('./routes/quotes'));
app.use('/api/orders',            auth, require('./routes/orders'));
app.use('/api/pricing-rules',     auth, require('./routes/pricing_rules'));
app.use('/api/products',          auth, require('./routes/products'));
app.use('/api/suppliers',         auth, require('./routes/suppliers'));
app.use('/api/catalog',           auth, require('./routes/catalog'));
app.use('/api/purchase-orders',   auth, require('./routes/purchase_orders'));
app.use('/api/shipping',          auth, require('./routes/shipping'));
app.use('/api/jobs',              auth, require('./routes/production'));
app.use('/api/approvals',         auth, require('./routes/approvals'));
app.use('/api/mockups',           auth, require('./routes/mockups'));
app.use('/api/leads',             auth, require('./routes/crm'));
app.use('/api/deals',             auth, require('./routes/crm'));
app.use('/api/targets',           auth, require('./routes/sales_targets'));
app.use('/api/commissions',       auth, require('./routes/commissions'));
app.use('/api/hr',                auth, require('./routes/hr'));
app.use('/api/payments',          auth, require('./routes/payments'));
app.use('/api/expenses',          auth, require('./routes/expenses'));
app.use('/api/daily-transactions',auth, require('./routes/transactions'));
app.use('/api/taxes',             auth, require('./routes/taxes'));
app.use('/api/reports',           auth, require('./routes/reports'));
app.use('/api/departments',       auth, require('./routes/departments'));

// Complaints route
app.use('/api/complaints',        auth, require('./routes/complaints'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
