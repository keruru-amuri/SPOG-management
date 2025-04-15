import { supabase, InventoryItem } from '../supabase';

/**
 * Get all inventory items
 */
export async function getAllInventoryItems(): Promise<InventoryItem[]> {
  console.log('Fetching all inventory items...');
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, locations(name)')
      .order('name');

    if (error) {
      console.error('Error fetching inventory items:', error);
      return [];
    }

    console.log('Inventory items fetched successfully:', data);

    // Calculate status for each item
    return data.map(item => ({
      ...item,
      status: calculateItemStatus(item)
    })) as InventoryItem[];
  } catch (err) {
    console.error('Unexpected error in getAllInventoryItems:', err);
    return [];
  }
}

/**
 * Get inventory items by location
 */
export async function getInventoryItemsByLocation(locationId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, locations(name)')
    .eq('location_id', locationId)
    .order('name');

  if (error) {
    console.error('Error fetching inventory items by location:', error);
    return [];
  }

  // Calculate status for each item
  return data.map(item => ({
    ...item,
    status: calculateItemStatus(item)
  })) as InventoryItem[];
}

/**
 * Get an inventory item by ID
 */
export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, locations(name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching inventory item:', error);
    return null;
  }

  // Calculate status
  return {
    ...data,
    status: calculateItemStatus(data)
  } as InventoryItem;
}

/**
 * Get an inventory item by item code
 */
export async function getInventoryItemByCode(itemCode: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, locations(name)')
    .eq('item_code', itemCode)
    .single();

  if (error) {
    console.error('Error fetching inventory item by code:', error);
    return null;
  }

  // Calculate status
  return {
    ...data,
    status: calculateItemStatus(data)
  } as InventoryItem;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory item:', error);
    return null;
  }

  // Calculate status
  return {
    ...data,
    status: calculateItemStatus(data)
  } as InventoryItem;
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(id: string, updates: Partial<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status'>>): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory item:', error);
    return null;
  }

  // Calculate status
  return {
    ...data,
    status: calculateItemStatus(data)
  } as InventoryItem;
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting inventory item:', error);
    return false;
  }

  return true;
}

/**
 * Search inventory items
 */
export async function searchInventoryItems(query: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, locations(name)')
    .or(`name.ilike.%${query}%,item_code.ilike.%${query}%`)
    .order('name');

  if (error) {
    console.error('Error searching inventory items:', error);
    return [];
  }

  // Calculate status for each item
  return data.map(item => ({
    ...item,
    status: calculateItemStatus(item)
  })) as InventoryItem[];
}

/**
 * Get low stock inventory items
 */
export async function getLowStockItems(): Promise<InventoryItem[]> {
  console.log('Fetching low stock items...');
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, locations(name)')
      .order('name');

    if (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }

    console.log('Low stock items data fetched:', data);

    // Filter and calculate status for each item
    const lowStockItems = data
      .map(item => ({
        ...item,
        status: calculateItemStatus(item)
      }))
      .filter(item => item.status === 'low') as InventoryItem[];

    console.log('Filtered low stock items:', lowStockItems);
    return lowStockItems;
  } catch (err) {
    console.error('Unexpected error in getLowStockItems:', err);
    return [];
  }
}

/**
 * Get critical stock inventory items
 */
export async function getCriticalStockItems(): Promise<InventoryItem[]> {
  console.log('Fetching critical stock items...');
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, locations(name)')
      .order('name');

    if (error) {
      console.error('Error fetching critical stock items:', error);
      return [];
    }

    console.log('Critical stock items data fetched:', data);

    // Filter and calculate status for each item
    const criticalStockItems = data
      .map(item => ({
        ...item,
        status: calculateItemStatus(item)
      }))
      .filter(item => item.status === 'critical') as InventoryItem[];

    console.log('Filtered critical stock items:', criticalStockItems);
    return criticalStockItems;
  } catch (err) {
    console.error('Unexpected error in getCriticalStockItems:', err);
    return [];
  }
}

/**
 * Calculate item status based on thresholds
 */
function calculateItemStatus(item: any): 'normal' | 'low' | 'critical' {
  console.log('Calculating status for item:', item.name);
  console.log('Current balance:', item.current_balance);
  console.log('Min threshold:', item.min_threshold);
  console.log('Critical threshold:', item.critical_threshold);

  // Convert to numbers to ensure proper comparison
  const currentBalance = Number(item.current_balance);
  const minThreshold = Number(item.min_threshold);
  const criticalThreshold = Number(item.critical_threshold);

  if (currentBalance <= criticalThreshold) {
    console.log('Status: critical');
    return 'critical';
  } else if (currentBalance <= minThreshold) {
    console.log('Status: low');
    return 'low';
  } else {
    console.log('Status: normal');
    return 'normal';
  }
}
