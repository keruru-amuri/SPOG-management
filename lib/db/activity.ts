import { supabase, ActivityLog } from '../supabase';

/**
 * Create an activity log entry
 */
export async function createActivityLog(log: Omit<ActivityLog, 'id' | 'created_at' | 'timestamp'>): Promise<ActivityLog | null> {
  console.log('Creating activity log:', log);
  try {
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

    console.log('Activity log created successfully:', data);
    return data as ActivityLog;
  } catch (err) {
    console.error('Unexpected error in createActivityLog:', err);
    return null;
  }
}

/**
 * Get recent activity logs
 */
export async function getRecentActivityLogs(limit: number = 10): Promise<ActivityLog[]> {
  console.log('Fetching recent activity logs...');
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, users(username), inventory_items(name, item_code, unit, consumption_unit)')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent activity logs:', error);
      return [];
    }

    console.log('Activity logs fetched successfully:', data);
    return data as ActivityLog[];
  } catch (err) {
    console.error('Unexpected error in getRecentActivityLogs:', err);
    return [];
  }
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
