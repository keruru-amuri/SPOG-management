import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export type User = {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: string;
  item_code: string;
  name: string;
  category: 'Sealant' | 'Paint' | 'Oil' | 'Grease';
  description: string | null;
  current_balance: number;
  original_amount: number;
  unit: string;
  consumption_unit: string;
  location_id: string;
  min_threshold: number;
  critical_threshold: number;
  created_at: string;
  updated_at: string;
  // Computed property (not in DB)
  status?: 'normal' | 'low' | 'critical';
  // Join with locations table
  locations?: {
    id: string;
    name: string;
    description?: string | null;
  };
  // Properties needed for ConsumptionModal
  currentBalance?: number;
  originalAmount?: number;
  consumptionUnit?: string;
  location?: string;
};

export type ConsumptionRecord = {
  id: string;
  item_id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  timestamp: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  action_type: 'consumption' | 'adjustment' | 'addition';
  item_id: string;
  details: Record<string, any>;
  timestamp: string;
  created_at: string;
};
