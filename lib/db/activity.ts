import { supabase, ActivityLog } from '../supabase';

/**
 * Create an activity log entry
 */
export async function createActivityLog(log: Omit<ActivityLog, 'id' | 'created_at' | 'timestamp'>): Promise<ActivityLog | null> {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert([{
      ...log,
      timestamp: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating activity log:', error);
    return null;
  }
  
  return data as ActivityLog;
}

/**
 * Get recent activity logs
 */
export async function getRecentActivityLogs(limit: number = 10): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, users(username), inventory_items(name, item_code)')
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching recent activity logs:', error);
    return [];
  }
  
  return data as ActivityLog[];
}

/**
 * Get activity logs by user
 */
export async function getActivityLogsByUser(userId: string, limit: number = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, inventory_items(name, item_code)')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching activity logs by user:', error);
    return [];
  }
  
  return data as ActivityLog[];
}

/**
 * Get activity logs by item
 */
export async function getActivityLogsByItem(itemId: string, limit: number = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, users(username)')
    .eq('item_id', itemId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching activity logs by item:', error);
    return [];
  }
  
  return data as ActivityLog[];
}
