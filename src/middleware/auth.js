const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authenticateUser = async (req, res, next) => {
  try {
    const tokenHeader = req.headers.authorization;
    
    if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    } 
    
    const token = tokenHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = { id: user.id };
    next();
    
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateUser };
