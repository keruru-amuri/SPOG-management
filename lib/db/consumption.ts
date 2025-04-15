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
  console.log('Recording consumption:', { itemId, userId, amount, reason });

  try {
    // Get the current item
    const item = await getInventoryItemById(itemId);
    if (!item) {
      console.warn('Item not found:', itemId); // Changed from error to warn to avoid console errors
      return { success: false, message: 'Item not found' };
    }

    console.log('Current item:', item);

    // Convert amount to the same unit as current_balance if needed
    let convertedAmount = Number(amount);

    // Check if we need to convert units (e.g., ml to L)
    if (item.consumption_unit && item.unit && item.consumption_unit !== item.unit) {
      console.log('Converting units:', { from: item.consumption_unit, to: item.unit, amount });

      // Handle common unit conversions
      const fromUnit = item.consumption_unit.toLowerCase();
      const toUnit = item.unit.toLowerCase();

      // VOLUME CONVERSIONS
      // Metric volume conversions
      if (fromUnit === 'ml' && toUnit === 'l') {
        convertedAmount = convertedAmount / 1000; // ml to L
        console.log('Converting ml to L:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'l' && toUnit === 'ml') {
        convertedAmount = convertedAmount * 1000; // L to ml
        console.log('Converting L to ml:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'cl' && toUnit === 'l') {
        convertedAmount = convertedAmount / 100; // cl to L
        console.log('Converting cl to L:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'l' && toUnit === 'cl') {
        convertedAmount = convertedAmount * 100; // L to cl
        console.log('Converting L to cl:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'ml' && toUnit === 'cl') {
        convertedAmount = convertedAmount / 10; // ml to cl
        console.log('Converting ml to cl:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'cl' && toUnit === 'ml') {
        convertedAmount = convertedAmount * 10; // cl to ml
        console.log('Converting cl to ml:', { original: amount, converted: convertedAmount });
      }
      // Imperial volume conversions
      else if (fromUnit === 'fl_oz' && toUnit === 'gal') {
        convertedAmount = convertedAmount / 128; // fluid oz to gallon
        console.log('Converting fl_oz to gal:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'gal' && toUnit === 'fl_oz') {
        convertedAmount = convertedAmount * 128; // gallon to fluid oz
        console.log('Converting gal to fl_oz:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'pt' && toUnit === 'gal') {
        convertedAmount = convertedAmount / 8; // pint to gallon
        console.log('Converting pt to gal:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'gal' && toUnit === 'pt') {
        convertedAmount = convertedAmount * 8; // gallon to pint
        console.log('Converting gal to pt:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'qt' && toUnit === 'gal') {
        convertedAmount = convertedAmount / 4; // quart to gallon
        console.log('Converting qt to gal:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'gal' && toUnit === 'qt') {
        convertedAmount = convertedAmount * 4; // gallon to quart
        console.log('Converting gal to qt:', { original: amount, converted: convertedAmount });
      }
      // Additional imperial volume conversions
      else if (fromUnit === 'fl_oz' && toUnit === 'pt') {
        convertedAmount = convertedAmount / 16; // fluid oz to pint
        console.log('Converting fl_oz to pt:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'pt' && toUnit === 'fl_oz') {
        convertedAmount = convertedAmount * 16; // pint to fluid oz
        console.log('Converting pt to fl_oz:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'fl_oz' && toUnit === 'qt') {
        convertedAmount = convertedAmount / 32; // fluid oz to quart
        console.log('Converting fl_oz to qt:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'qt' && toUnit === 'fl_oz') {
        convertedAmount = convertedAmount * 32; // quart to fluid oz
        console.log('Converting qt to fl_oz:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'pt' && toUnit === 'qt') {
        convertedAmount = convertedAmount / 2; // pint to quart
        console.log('Converting pt to qt:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'qt' && toUnit === 'pt') {
        convertedAmount = convertedAmount * 2; // quart to pint
        console.log('Converting qt to pt:', { original: amount, converted: convertedAmount });
      }
      // Metric to Imperial conversions
      else if (fromUnit === 'ml' && toUnit === 'fl_oz') {
        convertedAmount = convertedAmount / 29.574; // ml to fluid oz
        console.log('Converting ml to fl_oz:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'fl_oz' && toUnit === 'ml') {
        convertedAmount = convertedAmount * 29.574; // fluid oz to ml
        console.log('Converting fl_oz to ml:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'l' && toUnit === 'gal') {
        convertedAmount = convertedAmount / 3.78541; // L to gallon
        console.log('Converting l to gal:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'gal' && toUnit === 'l') {
        convertedAmount = convertedAmount * 3.78541; // gallon to L
        console.log('Converting gal to l:', { original: amount, converted: convertedAmount });
      }

      // WEIGHT CONVERSIONS
      // Metric weight conversions
      else if (fromUnit === 'g' && toUnit === 'kg') {
        convertedAmount = convertedAmount / 1000; // g to kg
        console.log('Converting g to kg:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'kg' && toUnit === 'g') {
        convertedAmount = convertedAmount * 1000; // kg to g
        console.log('Converting kg to g:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'mg' && toUnit === 'g') {
        convertedAmount = convertedAmount / 1000; // mg to g
        console.log('Converting mg to g:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'g' && toUnit === 'mg') {
        convertedAmount = convertedAmount * 1000; // g to mg
        console.log('Converting g to mg:', { original: amount, converted: convertedAmount });
      }
      // Imperial weight conversions
      else if (fromUnit === 'oz_wt' && toUnit === 'lb') {
        convertedAmount = convertedAmount / 16; // oz to lb
        console.log('Converting oz_wt to lb:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'lb' && toUnit === 'oz_wt') {
        convertedAmount = convertedAmount * 16; // lb to oz
        console.log('Converting lb to oz_wt:', { original: amount, converted: convertedAmount });
      }
      // Metric to Imperial weight conversions
      else if (fromUnit === 'g' && toUnit === 'oz_wt') {
        convertedAmount = convertedAmount / 28.3495; // g to oz
        console.log('Converting g to oz_wt:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'oz_wt' && toUnit === 'g') {
        convertedAmount = convertedAmount * 28.3495; // oz to g
        console.log('Converting oz_wt to g:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'kg' && toUnit === 'lb') {
        convertedAmount = convertedAmount * 2.20462; // kg to lb
        console.log('Converting kg to lb:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'lb' && toUnit === 'kg') {
        convertedAmount = convertedAmount / 2.20462; // lb to kg
        console.log('Converting lb to kg:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'oz_wt' && toUnit === 'kg') {
        convertedAmount = convertedAmount * 0.0283495; // oz to kg (1 oz = 0.0283495 kg)
        console.log('Converting oz_wt to kg:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'kg' && toUnit === 'oz_wt') {
        convertedAmount = convertedAmount / 0.0283495; // kg to oz (1 kg = 35.274 oz)
        console.log('Converting kg to oz_wt:', { original: amount, converted: convertedAmount });
      }

      // LENGTH CONVERSIONS
      // Metric length conversions
      else if (fromUnit === 'mm' && toUnit === 'cm') {
        convertedAmount = convertedAmount / 10; // mm to cm
        console.log('Converting mm to cm:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'cm' && toUnit === 'mm') {
        convertedAmount = convertedAmount * 10; // cm to mm
        console.log('Converting cm to mm:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'cm' && toUnit === 'm') {
        convertedAmount = convertedAmount / 100; // cm to m
        console.log('Converting cm to m:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'm' && toUnit === 'cm') {
        convertedAmount = convertedAmount * 100; // m to cm
        console.log('Converting m to cm:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'mm' && toUnit === 'm') {
        convertedAmount = convertedAmount / 1000; // mm to m
        console.log('Converting mm to m:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'm' && toUnit === 'mm') {
        convertedAmount = convertedAmount * 1000; // m to mm
        console.log('Converting m to mm:', { original: amount, converted: convertedAmount });
      }
      // Imperial length conversions
      else if (fromUnit === 'in' && toUnit === 'ft') {
        convertedAmount = convertedAmount / 12; // inch to foot
        console.log('Converting in to ft:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'ft' && toUnit === 'in') {
        convertedAmount = convertedAmount * 12; // foot to inch
        console.log('Converting ft to in:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'ft' && toUnit === 'yd') {
        convertedAmount = convertedAmount / 3; // foot to yard
        console.log('Converting ft to yd:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'yd' && toUnit === 'ft') {
        convertedAmount = convertedAmount * 3; // yard to foot
        console.log('Converting yd to ft:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'in' && toUnit === 'yd') {
        convertedAmount = convertedAmount / 36; // inch to yard
        console.log('Converting in to yd:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'yd' && toUnit === 'in') {
        convertedAmount = convertedAmount * 36; // yard to inch
        console.log('Converting yd to in:', { original: amount, converted: convertedAmount });
      }
      // Metric to Imperial length conversions
      else if (fromUnit === 'cm' && toUnit === 'in') {
        convertedAmount = convertedAmount / 2.54; // cm to inch
        console.log('Converting cm to in:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'in' && toUnit === 'cm') {
        convertedAmount = convertedAmount * 2.54; // inch to cm
        console.log('Converting in to cm:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'm' && toUnit === 'ft') {
        convertedAmount = convertedAmount * 3.28084; // m to foot
        console.log('Converting m to ft:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'ft' && toUnit === 'm') {
        convertedAmount = convertedAmount / 3.28084; // foot to m
        console.log('Converting ft to m:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'mm' && toUnit === 'in') {
        convertedAmount = convertedAmount / 25.4; // mm to inch
        console.log('Converting mm to in:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'in' && toUnit === 'mm') {
        convertedAmount = convertedAmount * 25.4; // inch to mm
        console.log('Converting in to mm:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'm' && toUnit === 'yd') {
        convertedAmount = convertedAmount * 1.09361; // m to yard
        console.log('Converting m to yd:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'yd' && toUnit === 'm') {
        convertedAmount = convertedAmount / 1.09361; // yard to m
        console.log('Converting yd to m:', { original: amount, converted: convertedAmount });
      }

      // AREA CONVERSIONS
      else if (fromUnit === 'cm²' && toUnit === 'm²') {
        convertedAmount = convertedAmount / 10000; // cm² to m²
        console.log('Converting cm² to m²:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'm²' && toUnit === 'cm²') {
        convertedAmount = convertedAmount * 10000; // m² to cm²
        console.log('Converting m² to cm²:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'in²' && toUnit === 'ft²') {
        convertedAmount = convertedAmount / 144; // in² to ft²
        console.log('Converting in² to ft²:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'ft²' && toUnit === 'in²') {
        convertedAmount = convertedAmount * 144; // ft² to in²
        console.log('Converting ft² to in²:', { original: amount, converted: convertedAmount });
      }
      // Metric to Imperial area conversions
      else if (fromUnit === 'cm²' && toUnit === 'in²') {
        convertedAmount = convertedAmount / 6.4516; // cm² to in²
        console.log('Converting cm² to in²:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'in²' && toUnit === 'cm²') {
        convertedAmount = convertedAmount * 6.4516; // in² to cm²
        console.log('Converting in² to cm²:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'm²' && toUnit === 'ft²') {
        convertedAmount = convertedAmount * 10.7639; // m² to ft²
        console.log('Converting m² to ft²:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'ft²' && toUnit === 'm²') {
        convertedAmount = convertedAmount / 10.7639; // ft² to m²
        console.log('Converting ft² to m²:', { original: amount, converted: convertedAmount });
      }

      // COUNT/PACKAGING CONVERSIONS
      else if (fromUnit === 'pcs' && toUnit === 'dozen') {
        convertedAmount = convertedAmount / 12; // pieces to dozen
        console.log('Converting pcs to dozen:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'dozen' && toUnit === 'pcs') {
        convertedAmount = convertedAmount * 12; // dozen to pieces
        console.log('Converting dozen to pcs:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'pcs' && toUnit === 'box') {
        // Assuming a standard box contains 24 pieces, but this could be customized per item in the future
        convertedAmount = convertedAmount / 24; // pieces to box
        console.log('Converting pcs to box:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'box' && toUnit === 'pcs') {
        // Assuming a standard box contains 24 pieces
        convertedAmount = convertedAmount * 24; // box to pieces
        console.log('Converting box to pcs:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'pcs' && toUnit === 'pack') {
        // Assuming a standard pack contains 6 pieces
        convertedAmount = convertedAmount / 6; // pieces to pack
        console.log('Converting pcs to pack:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'pack' && toUnit === 'pcs') {
        // Assuming a standard pack contains 6 pieces
        convertedAmount = convertedAmount * 6; // pack to pieces
        console.log('Converting pack to pcs:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'dozen' && toUnit === 'box') {
        // Assuming a standard box contains 2 dozens
        convertedAmount = convertedAmount / 2; // dozen to box
        console.log('Converting dozen to box:', { original: amount, converted: convertedAmount });
      } else if (fromUnit === 'box' && toUnit === 'dozen') {
        // Assuming a standard box contains 2 dozens
        convertedAmount = convertedAmount * 2; // box to dozen
        console.log('Converting box to dozen:', { original: amount, converted: convertedAmount });
      }
      // Note: For box conversions, we would need to add a pcs_per_box field to the InventoryItem type
      // For now, we'll use standard conversions or could use metadata in the future

      console.log('Converted amount:', { original: amount, converted: convertedAmount });
    } else if (item.consumption_unit !== item.unit) {
      // If we get here, it means we have different units but no conversion rule
      console.warn('Unsupported unit conversion:', {
        from: item.consumption_unit,
        to: item.unit,
        amount,
        convertedAmount
      });
    }

    // Check if there's enough balance
    if (Number(item.current_balance) < convertedAmount) {
      const balanceInfo = {
        current: item.current_balance,
        requested: amount,
        convertedAmount,
        unit: item.unit,
        consumptionUnit: item.consumption_unit
      };
      console.warn('Not enough balance:', balanceInfo); // Changed from error to warn to avoid console errors

      // Create a more informative error message
      const errorMessage = `Not enough balance: ${item.current_balance} ${item.unit} available, but need ${convertedAmount.toFixed(2)} ${item.unit} (converted from ${amount} ${item.consumption_unit})`;

      return { success: false, message: errorMessage };
    }

    // Update the item balance
    const newBalance = Number(item.current_balance) - convertedAmount;
    console.log('Updating balance:', {
      oldBalance: item.current_balance,
      newBalance,
      amount,
      convertedAmount,
      unit: item.unit,
      consumptionUnit: item.consumption_unit
    });

    const updatedItem = await updateInventoryItem(itemId, {
      current_balance: newBalance
      // updated_at is handled automatically by Supabase
    });

    if (!updatedItem) {
      console.warn('Failed to update item balance'); // Changed from error to warn to avoid console errors
      return { success: false, message: 'Failed to update item balance' };
    }

    console.log('Item updated successfully:', updatedItem);

    // Create consumption record
    console.log('Creating consumption record');
    const { data: consumptionData, error: consumptionError } = await supabase
      .from('consumption_records')
      .insert([{
        item_id: itemId,
        user_id: userId,
        amount,
        reason: reason || null,
        timestamp: new Date().toISOString()
      }])
      .select();

    if (consumptionError) {
      console.warn('Error creating consumption record:', consumptionError); // Changed from error to warn to avoid console errors
      // Try to revert the balance update
      await updateInventoryItem(itemId, {
        current_balance: item.current_balance
        // updated_at is handled automatically by Supabase
      });
      return { success: false, message: 'Failed to create consumption record' };
    }

    console.log('Consumption record created:', consumptionData);

    // Create activity log
    console.log('Creating activity log');
    const activityLog = await createActivityLog({
      user_id: userId,
      action_type: 'consumption',
      item_id: itemId,
      details: {
        amount,
        unit: item.consumption_unit || item.unit,
        reason: reason || null,
        previous_balance: item.current_balance,
        new_balance: newBalance
      }
    });

    console.log('Activity log created:', activityLog);

    return {
      success: true,
      message: 'Consumption recorded successfully',
      updatedItem
    };
  } catch (error) {
    console.warn('Error in recordConsumption:', error); // Changed from error to warn to avoid console errors
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
    console.warn('Error fetching consumption records:', error); // Changed from error to warn to avoid console errors
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
    console.warn('Error fetching recent consumption records:', error); // Changed from error to warn to avoid console errors
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
    console.warn('Error fetching consumption records by user:', error); // Changed from error to warn to avoid console errors
    return [];
  }

  return data as ConsumptionRecord[];
}

/**
 * Get consumption records by date range
 */
export async function getConsumptionRecordsByDateRange(fromDate: string, toDate: string): Promise<ConsumptionRecord[]> {
  const { data, error } = await supabase
    .from('consumption_records')
    .select('*, inventory_items(name, unit, category), users(username)')
    .gte('timestamp', `${fromDate}T00:00:00`)
    .lte('timestamp', `${toDate}T23:59:59`)
    .order('timestamp', { ascending: false });

  if (error) {
    console.warn('Error fetching consumption records by date range:', error);
    return [];
  }

  return data as ConsumptionRecord[];
}