const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hash password function
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function updateAdminPassword() {
  try {
    // Get password from command line arguments or prompt for it
    const newPassword = process.argv[2];

    if (!newPassword) {
      console.error('Please provide a password as a command line argument');
      console.error('Usage: node update-admin-password.js <new-password>');
      process.exit(1);
    }

    // Hash the password
    const passwordHash = await hashPassword(newPassword);

    // Update the admin user's password
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('username', 'admin')
      .select();

    if (error) {
      console.error('Error updating admin password:', error);
      return;
    }

    console.log('Admin password updated successfully:', data);
  } catch (error) {
    console.error('Error in updateAdminPassword:', error);
  }
}

// Run the function
updateAdminPassword();
