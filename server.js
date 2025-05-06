// branding-shop-backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS
app.use(cors({ origin: '*' }));
app.options('*', cors());

// JSON bodies
app.use(express.json());

// Auth middleware
const auth = require('./middleware/auth');

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Core modules (all protected)
app.use('/api/users',           auth, require('./routes/users'));
app.use('/api/roles',           auth, require('./routes/roles'));
app.use('/api/quotes',          auth, require('./routes/quotes'));
app.use('/api/orders',          auth, require('./routes/orders'));
app.use('/api/pricing-rules',   auth, require('./routes/pricing_rules'));
app.use('/api/products',        auth, require('./routes/products'));
app.use('/api/suppliers',       auth, require('./routes/suppliers'));
app.use('/api/catalog',         auth, require('./routes/catalog'));
app.use('/api/purchase-orders', auth, require('./routes/purchase_orders'));
app.use('/api/shipping',        auth, require('./routes/shipping'));

// Production → now just "jobs"
app.use('/api/jobs',            auth, require('./routes/production'));
app.use('/api/approvals',       auth, require('./routes/approvals'));

// Mockups → now just "mockups"
app.use('/api/mockups',         auth, require('./routes/mockups'));

// CRM / Deals
app.use('/api/leads',           auth, require('./routes/crm'));
app.use('/api/deals',           auth, require('./routes/crm'));

// Sales targets & commissions
app.use('/api/targets',         auth, require('./routes/sales_targets'));
app.use('/api/commissions',     auth, require('./routes/commissions'));

// HR & related
app.use('/api/hr',              auth, require('./routes/hr'));
app.use('/api/payrolls',        auth, require('./routes/payrolls'));
app.use('/api/vacation-requests', auth, require('./routes/vacation_requests'));
app.use('/api/insurances',      auth, require('./routes/insurances'));
app.use('/api/loans',           auth, require('./routes/loans'));

// Finance modules
app.use('/api/payments',        auth, require('./routes/payments'));
app.use('/api/payment-types',   auth, require('./routes/payment_types'));
app.use('/api/payment-transactions', auth, require('./routes/payment_transactions'));
app.use('/api/payment-arrears', auth, require('./routes/payment_arrears'));
app.use('/api/expenses',        auth, require('./routes/expenses'));
app.use('/api/daily-transactions', auth, require('./routes/transactions'));
app.use('/api/taxes',           auth, require('./routes/taxes'));
app.use('/api/chart-accounts',  auth, require('./routes/chart_accounts'));

// Complaints & support
app.use('/api/complaints',      auth, require('./routes/complaints'));

// Reports
app.use('/api/reports',         auth, require('./routes/reports'));
app.use('/api/sales',           auth, require('./routes/reports_sales'));
app.use('/api/finance-summary', auth, require('./routes/reports_finance'));
app.use('/api/taxes-report',    auth, require('./routes/reports_taxes'));
app.use('/api/leave-report',    auth, require('./routes/reports_leave'));
app.use('/api/cashflow',        auth, require('./routes/reports_cashflow'));

// Departments
app.use('/api/departments',     auth, require('./routes/departments'));

// Final catch-all
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
