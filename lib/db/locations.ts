import { supabase, Location } from '../supabase';

/**
 * Get all locations
 */
export async function getAllLocations(): Promise<Location[]> {
  console.log('Fetching all locations...');
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    console.log('Locations fetched successfully:', data);
    return data as Location[];
  } catch (err) {
    console.error('Unexpected error in getAllLocations:', err);
    return [];
  }
}

/**
 * Get a location by ID
 */
export async function getLocationById(id: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching location:', error);
    return null;
  }

  return data as Location;
}

/**
 * Create a new location
 */
export async function createLocation(location: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .insert([location])
    .select()
    .single();

  if (error) {
    console.error('Error creating location:', error);
    return null;
  }

  return data as Location;
}

/**
 * Update a location
 */
export async function updateLocation(id: string, updates: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating location:', error);
    return null;
  }

  return data as Location;
}

/**
 * Delete a location
 */
export async function deleteLocation(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting location:', error);
    return false;
  }

  return true;
}
