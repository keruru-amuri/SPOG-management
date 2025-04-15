"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function TestPage() {
  const [locations, setLocations] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        console.log('Testing Supabase connection...')
        
        // Check Supabase URL and key
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Supabase Key (first 10 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10))
        
        // Test query to check if we can connect to locations
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .limit(10)
        
        if (locationsError) {
          console.error('Error fetching locations:', locationsError)
          setError(`Error fetching locations: ${locationsError.message}`)
        } else {
          console.log('Locations data:', locationsData)
          setLocations(locationsData || [])
        }
        
        // Test query to check if we can connect to inventory_items
        const { data: itemsData, error: itemsError } = await supabase
          .from('inventory_items')
          .select('*, locations(name)')
          .limit(10)
        
        if (itemsError) {
          console.error('Error fetching items:', itemsError)
          setError((prev) => prev ? `${prev}, Error fetching items: ${itemsError.message}` : `Error fetching items: ${itemsError.message}`)
        } else {
          console.log('Items data:', itemsData)
          setItems(itemsData || [])
        }
      } catch (err: any) {
        console.error('Unexpected error:', err)
        setError(`Unexpected error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      ) : (
        <div>
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p>Successfully connected to Supabase!</p>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Locations ({locations.length})</h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="border px-4 py-2">ID</th>
                  <th className="border px-4 py-2">Name</th>
                  <th className="border px-4 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location.id}>
                    <td className="border px-4 py-2">{location.id}</td>
                    <td className="border px-4 py-2">{location.name}</td>
                    <td className="border px-4 py-2">{location.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Inventory Items ({items.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="border px-4 py-2">ID</th>
                  <th className="border px-4 py-2">Code</th>
                  <th className="border px-4 py-2">Name</th>
                  <th className="border px-4 py-2">Category</th>
                  <th className="border px-4 py-2">Current Balance</th>
                  <th className="border px-4 py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-4 py-2">{item.id}</td>
                    <td className="border px-4 py-2">{item.item_code}</td>
                    <td className="border px-4 py-2">{item.name}</td>
                    <td className="border px-4 py-2">{item.category}</td>
                    <td className="border px-4 py-2">{item.current_balance} {item.unit}</td>
                    <td className="border px-4 py-2">{item.locations?.name || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
