if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
console.log('ENV CHECK:', process.env.SUPABASE_URL ? 'URL LOADED' : 'URL MISSING');


const express = require('express')
const { authenticateUser } = require('./middleware/auth');

const cors = require('cors')



const app = express()

app.use(cors())

app.get('/api/health', (req, res, next) => {
    res.json({status: 'ok' , message : "server is running" });
  })

app.get('/api/protected' , authenticateUser, (req, res) => {

   
    res.json({
            message: "You are Authenticated!" ,
            userId: req.user.id
        });
    });    

    // Invoice processing routes
const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

const PORT = process.env.PORT || 3000;
// Middleware to parse JSON bodies
app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

    







