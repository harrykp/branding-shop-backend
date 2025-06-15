// server.js (FULL & UPDATED)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Public reference route
app.use('/api', require('./routes/referenceData'));

// JWT Middleware
const { authenticate } = require('./middleware/auth');

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected reference routes
app.use('/api/industries', authenticate, require('./routes/industries'));
app.use('/api/referral-sources', authenticate, require('./routes/referral_sources'));
app.use('/api/product-categories', authenticate, require('./routes/product_categories'));

// Core protected routes
const protectedRoutes = [
  ['users', 'users'],
  ['roles', 'roles'],
  ['quotes', 'quotes'],
  ['orders', 'orders'],
  ['pricing-rules', 'pricing_rules'],
  ['products', 'products'],
  ['product-categories', 'product_categories'],
  ['suppliers', 'suppliers'],
  ['catalog', 'catalog'],
  ['purchase-orders', 'purchase_orders'],
  ['shipping', 'shipping'],
  ['jobs', 'jobs'],
  ['approvals', 'approvals'],
  ['mockups', 'mockups'],
  ['leads', 'leads'],
  ['deals', 'deals'],
  ['targets', 'sales_targets'],
  ['commissions', 'commissions'],
  ['hr', 'hr'],
  ['payments', 'payments'],
  ['expenses', 'expenses'],
  ['daily-transactions', 'transactions'],
  ['taxes', 'taxes'],
  ['reports', 'reports'],
  ['complaints', 'complaints'],
  ['cart', 'cart'],
  ['checkout', 'checkout'],
  ['admin', 'admin'],
  ['reports/sales', 'reports_sales'],
  ['reports/finance', 'reports_finance'],
  ['reports/taxes', 'reports_taxes'],
  ['reports/leave', 'reports_leave'],
  ['reports/cashflow', 'reports_cashflow'],
  ['chart-accounts', 'chart_accounts'],
  ['departments', 'departments'],
  ['insurances', 'insurances'],
  ['loans', 'loans'],
  ['payment-arrears', 'payment_arrears'],
  ['payment-transactions', 'payment_transactions'],
  ['payment-types', 'payment_types'],
  ['payrolls', 'payrolls'],
  ['vacation-requests', 'vacation_requests'],
  ['leave_requests', 'leave_requests'],
  ['leave_balances', 'leave_balances'],
  ['customers', 'customers']
];

// Register all protected routes
for (const [route, file] of protectedRoutes) {
  app.use(`/api/${route}`, authenticate, require(`./routes/${file}`));
}

// Serve static frontend
app.use('/store', express.static(path.join(__dirname, 'store')));
app.use('/', express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API listening on port ${PORT}`));
