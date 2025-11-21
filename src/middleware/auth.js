// backend/src/middleware/auth.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);



const authenticateUser = async (req, res, next) => {
  try {
    // step 1 & 2
    const tokenHeader = req.headers.authorization;
    if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
        return res.status(401).json('Access Denied: No token provided or invalid format.');
     
    } 
    const token = tokenHeader.split(' ')[1]; // Splits by space and takes the second element (the token)

    // step 3
    const { data: { user }, error } = await supabase.auth.getUser(token)

    //step 4
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' }); // What status code?
      }

    // step 5
    req.user = { id: user.id };

    // Step 6: Continue
    next();
    }
     catch (error) {
    return res.status(401).json({ error: 'Authentication failed' }); // What status code?
    }
};

module.exports = { authenticateUser };

  
  