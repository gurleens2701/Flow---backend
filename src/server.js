if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log('ENV CHECK:', process.env.SUPABASE_URL ? 'URL LOADED' : 'URL MISSING');

const express = require('express');
const { authenticateUser } = require('./middleware/auth');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'server is running' });
});

app.get('/api/protected', authenticateUser, (req, res) => {
  res.json({
    message: 'You are Authenticated!',
    userId: req.user.id
  });
});

const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

const priceRoutes = require('./routes/prices');
app.use('/api/prices', priceRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
