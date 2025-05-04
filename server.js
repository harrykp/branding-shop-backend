const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: process.env.GITHUB_PAGES_URL
}));
app.use(express.json());

// Auth & Users
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));

// Core features
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/pricing-rules', require('./routes/pricing_rules'));
app.use('/api/products', require('./routes/products'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/jobs', require('./routes/production'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/mockups', require('./routes/mockups'));

// CRM & Sales
app.use('/api/leads', require('./routes/crm'));
app.use('/api/deals', require('./routes/crm'));
app.use('/api/targets', require('./routes/sales_targets'));
app.use('/api/commissions', require('./routes/commissions'));

// HR & Finance
app.use('/api/hr', require('./routes/hr'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/daily-transactions', require('./routes/transactions'));
app.use('/api/taxes', require('./routes/taxes'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/departments', require('./routes/departments'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

