const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// DELETE /api/users/delete-account
router.delete('/delete-account', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user data from tables
    await supabaseAdmin.from('prices').delete().eq('user_id', userId);
    await supabaseAdmin.from('products').delete().eq('user_id', userId);
    await supabaseAdmin.from('warehouses').delete().eq('user_id', userId);
    await supabaseAdmin.from('invoices').delete().eq('user_id', userId);

    // Delete auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) throw error;

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;