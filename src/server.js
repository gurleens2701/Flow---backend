require('dotenv').config();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
    







