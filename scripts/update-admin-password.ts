const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = 'https://corhzxqrxtgidcsghkjx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcmh6eHFyeHRnaWRjc2doa2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDcwMjIsImV4cCI6MjA2MDIyMzAyMn0.3SJTmo0u5d_ouVGZ3EysKAh1m6t20CWU8ggtdSyW2gg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hash password function
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function updateAdminPassword() {
  try {
    // Hash the password
    const passwordHash = await hashPassword('admin123');

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
