// branding-shop-backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// This will guarantee the browser sees the right Access-Control-Allow-Headers
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());

// serve everything in /public as static assets
app.use(express.static(path.join(__dirname, '../public')));


// JWT auth middleware
const auth = require('./middleware/auth');

// -- Route imports --
const authRouter               = require('./routes/auth');
const usersRouter              = require('./routes/users');
const rolesRouter              = require('./routes/roles');
const quotesRouter             = require('./routes/quotes');
const ordersRouter             = require('./routes/orders');
const pricingRulesRouter       = require('./routes/pricing_rules');
const productsRouter           = require('./routes/products');
const productCategoriesRouter  = require('./routes/product_categories');
const suppliersRouter          = require('./routes/suppliers');
const catalogRouter            = require('./routes/catalog');
const purchaseOrdersRouter     = require('./routes/purchase_orders');
const shippingRouter           = require('./routes/shipping');
const jobsRouter               = require('./routes/jobs');
const approvalsRouter          = require('./routes/approvals');
const mockupsRouter            = require('./routes/mockups');
const leadsRouter              = require('./routes/leads');
const dealsRouter              = require('./routes/deals');
const salesTargetsRouter       = require('./routes/sales_targets');
const commissionsRouter        = require('./routes/commissions');
const hrRouter                 = require('./routes/hr');
const paymentsRouter           = require('./routes/payments');
const expensesRouter           = require('./routes/expenses');
const dailyTransactionsRouter  = require('./routes/transactions');
const taxesRouter              = require('./routes/taxes');
const reportsRouter            = require('./routes/reports');
const complaintsRouter         = require('./routes/complaints');
const cartRouter               = require('./routes/cart');

const reportsSalesRouter       = require('./routes/reports_sales');
const reportsFinanceRouter     = require('./routes/reports_finance');
const reportsTaxesRouter       = require('./routes/reports_taxes');
const reportsLeaveRouter       = require('./routes/reports_leave');
const reportsCashflowRouter    = require('./routes/reports_cashflow');

// -- Public routes --
app.use('/api/auth', authRouter);

// -- Protected routes (require a valid JWT) --
app.use('/api/users',             auth, usersRouter);
app.use('/api/roles',             auth, rolesRouter);
app.use('/api/quotes',            auth, quotesRouter);
app.use('/api/orders',            auth, ordersRouter);
app.use('/api/pricing-rules',     auth, pricingRulesRouter);
app.use('/api/products',          auth, productsRouter);
app.use('/api/product-categories',auth, productCategoriesRouter);
app.use('/api/suppliers',         auth, suppliersRouter);
app.use('/api/catalog',           auth, catalogRouter);
app.use('/api/purchase-orders',   auth, purchaseOrdersRouter);
app.use('/api/shipping',          auth, shippingRouter);
app.use('/api/jobs',              auth, jobsRouter);
app.use('/api/approvals',         auth, approvalsRouter);
app.use('/api/mockups',           auth, mockupsRouter);
app.use('/api/leads',             auth, leadsRouter);
app.use('/api/deals',             auth, dealsRouter);
app.use('/api/targets',           auth, salesTargetsRouter);
app.use('/api/commissions',       auth, commissionsRouter);
app.use('/api/hr',                auth, hrRouter);
app.use('/api/payments',          auth, paymentsRouter);
app.use('/api/expenses',          auth, expensesRouter);
app.use('/api/daily-transactions',auth, dailyTransactionsRouter);
app.use('/api/taxes',             auth, taxesRouter);
app.use('/api/reports',           auth, reportsRouter);
app.use('/api/complaints',        auth, complaintsRouter);
app.use('/api/cart',              auth, cartRouter);

// -- Report sub-endpoints (all under /api/reports) --
app.use('/api/reports/sales',    auth, reportsSalesRouter);
app.use('/api/reports/finance',  auth, reportsFinanceRouter);
app.use('/api/reports/taxes',    auth, reportsTaxesRouter);
app.use('/api/reports/leave',    auth, reportsLeaveRouter);
app.use('/api/reports/cashflow', auth, reportsCashflowRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
