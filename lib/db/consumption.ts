import { supabase, ConsumptionRecord, InventoryItem } from '../supabase';
import { getInventoryItemById, updateInventoryItem } from './inventory';
import { createActivityLog } from './activity';

/**
 * Record consumption of an inventory item
 */
export async function recordConsumption(
  itemId: string, 
  userId: string, 
  amount: number, 
  reason?: string
): Promise<{ success: boolean; message: string; updatedItem?: InventoryItem }> {
  // Start a transaction
  const { error: transactionError } = await supabase.rpc('begin_transaction');
  if (transactionError) {
    console.error('Error starting transaction:', transactionError);
    return { success: false, message: 'Failed to start transaction' };
  }

  try {
    // Get the current item
    const item = await getInventoryItemById(itemId);
    if (!item) {
      await supabase.rpc('rollback_transaction');
      return { success: false, message: 'Item not found' };
    }

    // Check if there's enough balance
    if (item.current_balance < amount) {
      await supabase.rpc('rollback_transaction');
      return { success: false, message: 'Not enough balance for consumption' };
    }

    // Update the item balance
    const newBalance = item.current_balance - amount;
    const updatedItem = await updateInventoryItem(itemId, { 
      current_balance: newBalance,
      updated_at: new Date().toISOString()
    });

    if (!updatedItem) {
      await supabase.rpc('rollback_transaction');
      return { success: false, message: 'Failed to update item balance' };
    }

    // Create consumption record
    const { error: consumptionError } = await supabase
      .from('consumption_records')
      .insert([{
        item_id: itemId,
        user_id: userId,
        amount,
        reason: reason || null,
        timestamp: new Date().toISOString()
      }]);

    if (consumptionError) {
      console.error('Error creating consumption record:', consumptionError);
      await supabase.rpc('rollback_transaction');
      return { success: false, message: 'Failed to create consumption record' };
    }

    // Create activity log
    await createActivityLog({
      user_id: userId,
      action_type: 'consumption',
      item_id: itemId,
      details: {
        amount,
        reason: reason || null,
        previous_balance: item.current_balance,
        new_balance: newBalance
      }
    });

    // Commit the transaction
    const { error: commitError } = await supabase.rpc('commit_transaction');
    if (commitError) {
      console.error('Error committing transaction:', commitError);
      await supabase.rpc('rollback_transaction');
      return { success: false, message: 'Failed to commit transaction' };
    }

    return { 
      success: true, 
      message: 'Consumption recorded successfully', 
      updatedItem 
    };
  } catch (error) {
    console.error('Error in recordConsumption:', error);
    await supabase.rpc('rollback_transaction');
    return { success: false, message: 'An unexpected error occurred' };
  }
}

/**
 * Get consumption records for an item
 */
export async function getConsumptionRecordsByItem(itemId: string): Promise<ConsumptionRecord[]> {
  const { data, error } = await supabase
    .from('consumption_records')
    .select('*, users(username)')
    .eq('item_id', itemId)
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error('Error fetching consumption records:', error);
    return [];
  }
  
  return data as ConsumptionRecord[];
}

/**
 * Get recent consumption records
 */
export async function getRecentConsumptionRecords(limit: number = 10): Promise<ConsumptionRecord[]> {
  const { data, error } = await supabase
    .from('consumption_records')
    .select('*, users(username), inventory_items(name, unit)')
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching recent consumption records:', error);
    return [];
  }
  
  return data as ConsumptionRecord[];
}

/**
 * Get consumption records by user
 */
export async function getConsumptionRecordsByUser(userId: string): Promise<ConsumptionRecord[]> {
  const { data, error } = await supabase
    .from('consumption_records')
    .select('*, inventory_items(name, unit)')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error('Error fetching consumption records by user:', error);
    return [];
  }
  
  return data as ConsumptionRecord[];
}
