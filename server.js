// branding-shop-backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const auth = require('./middleware/auth');

// Route handlers
const authRouter             = require('./routes/auth');
const usersRouter            = require('./routes/users');
const rolesRouter            = require('./routes/roles');
const quotesRouter           = require('./routes/quotes');
const ordersRouter           = require('./routes/orders');
const pricingRulesRouter     = require('./routes/pricing_rules');
const productsRouter         = require('./routes/products');
const suppliersRouter        = require('./routes/suppliers');
const catalogRouter          = require('./routes/catalog');
const purchaseOrdersRouter   = require('./routes/purchase_orders');
const shippingRouter         = require('./routes/shipping');
const productionRouter       = require('./routes/production');
const approvalsRouter        = require('./routes/approvals');
const mockupsRouter          = require('./routes/mockups');
const leadsRouter            = require('./routes/leads');
const dealsRouter            = require('./routes/deals');
const targetsRouter          = require('./routes/sales_targets');
const commissionsRouter      = require('./routes/commissions');
const hrRouter               = require('./routes/hr');
const paymentsRouter         = require('./routes/payments');
const expensesRouter         = require('./routes/expenses');
const transactionsRouter     = require('./routes/transactions');
const taxesRouter            = require('./routes/taxes');
const departmentsRouter      = require('./routes/departments');
const complaintsRouter       = require('./routes/complaints');

// Report routers
const reportsSalesRouter     = require('./routes/reports_sales');
const reportsFinanceRouter   = require('./routes/reports_finance');
const reportsTaxesRouter     = require('./routes/reports_taxes');
const reportsLeaveRouter     = require('./routes/reports_leave');
const reportsCashflowRouter  = require('./routes/reports_cashflow');

// Public (no auth)
app.use('/api/auth', authRouter);

// Protected (require valid JWT)
app.use('/api/users',            auth, usersRouter);
app.use('/api/roles',            auth, rolesRouter);
app.use('/api/quotes',           auth, quotesRouter);
app.use('/api/orders',           auth, ordersRouter);
app.use('/api/pricing-rules',    auth, pricingRulesRouter);
app.use('/api/products',         auth, productsRouter);
app.use('/api/suppliers',        auth, suppliersRouter);
app.use('/api/catalog',          auth, catalogRouter);
app.use('/api/purchase-orders',  auth, purchaseOrdersRouter);
app.use('/api/shipping',         auth, shippingRouter);
app.use('/api/jobs',             auth, productionRouter);
app.use('/api/approvals',        auth, approvalsRouter);
app.use('/api/mockups',          auth, mockupsRouter);
app.use('/api/leads',            auth, leadsRouter);
app.use('/api/deals',            auth, dealsRouter);
app.use('/api/targets',          auth, targetsRouter);
app.use('/api/commissions',      auth, commissionsRouter);
app.use('/api/hr',               auth, hrRouter);
app.use('/api/payments',         auth, paymentsRouter);
app.use('/api/expenses',         auth, expensesRouter);
app.use('/api/daily-transactions', auth, transactionsRouter);
app.use('/api/taxes',            auth, taxesRouter);
app.use('/api/departments',      auth, departmentsRouter);
app.use('/api/complaints',       auth, complaintsRouter);

// Report endpoints
app.use('/api/sales',    auth, reportsSalesRouter);
app.use('/api/finance',  auth, reportsFinanceRouter);
app.use('/api/taxes-report', auth, reportsTaxesRouter);
app.use('/api/leave',    auth, reportsLeaveRouter);
app.use('/api/cashflow', auth, reportsCashflowRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
