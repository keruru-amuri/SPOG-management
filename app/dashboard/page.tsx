"use client"

import { useState, useEffect, useMemo } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { BarChart3, Filter, LogOut, Plus, Search, Settings, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsumptionModal, Item } from "@/components/consumption-modal"
import { AddItemModal } from "@/components/add-item-modal"
import { LocationSelector } from "@/components/location-selector"
import { FilterModal, FilterCriteria } from "@/components/filter-modal"
import { InventoryItem } from "@/lib/supabase"
import { getAllInventoryItems, getLowStockItems, getCriticalStockItems } from "@/lib/db/inventory"
import { getAllLocations } from "@/lib/db/locations"
import { getRecentActivityLogs } from "@/lib/db/activity"

export default function DashboardPage() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showConsumptionModal, setShowConsumptionModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [currentLocation, setCurrentLocation] = useState("All Locations")
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [criticalStockItems, setCriticalStockItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<{value: string, label: string}[]>([{ value: "All Locations", label: "All Locations" }])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    categories: [],
    stockLevel: 'all',
    minStock: 0,
    maxStock: 100,
    units: []
  })
  const [isFiltered, setIsFiltered] = useState(false)

  // Fetch data from the database
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        console.log('Fetching dashboard data...')

        // Check Supabase URL and key
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Supabase Key (first 10 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10))

        // Fetch inventory items
        console.log('Fetching inventory items...')
        const items = await getAllInventoryItems()
        console.log('Inventory items:', items)
        setInventoryItems(items)

        // Fetch low stock items
        console.log('Fetching low stock items...')
        const lowItems = await getLowStockItems()
        console.log('Low stock items:', lowItems)
        setLowStockItems(lowItems)

        // Fetch critical stock items
        console.log('Fetching critical stock items...')
        const criticalItems = await getCriticalStockItems()
        console.log('Critical stock items:', criticalItems)
        setCriticalStockItems(criticalItems)

        // Fetch locations
        console.log('Fetching locations...')
        const locationData = await getAllLocations()
        console.log('Locations:', locationData)
        setLocations([
          { value: "All Locations", label: "All Locations" },
          ...locationData.map(loc => ({
            value: loc.name,
            label: loc.name
          }))
        ])

        // Fetch activity logs
        console.log('Fetching activity logs...')
        const logs = await getRecentActivityLogs(5)
        console.log('Activity logs:', logs)
        setActivityLogs(logs)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Get unique categories and units for filter options
  const availableCategories = useMemo(() => {
    const categories = inventoryItems
      .map(item => item.category)
      .filter(Boolean) // Remove null/undefined
      .filter((value, index, self) => self.indexOf(value) === index) // Unique values
      .sort()
    return categories
  }, [inventoryItems])

  const availableUnits = useMemo(() => {
    const units = inventoryItems
      .map(item => item.unit)
      .filter(Boolean) // Remove null/undefined
      .filter((value, index, self) => self.indexOf(value) === index) // Unique values
      .sort()
    return units
  }, [inventoryItems])

  // Handle applying filters
  const handleApplyFilters = (filters: FilterCriteria) => {
    setFilterCriteria(filters)
    setIsFiltered(filters.categories.length > 0 ||
                 filters.stockLevel !== 'all' ||
                 filters.units.length > 0 ||
                 filters.minStock > 0 ||
                 filters.maxStock < 100)
  }

  // Handle clearing filters
  const handleClearFilters = () => {
    setFilterCriteria({
      categories: [],
      stockLevel: 'all',
      minStock: 0,
      maxStock: 100,
      units: []
    })
    setIsFiltered(false)
  }

  // Helper function to calculate stock percentage
  const calculateStockPercentage = (item: InventoryItem): number => {
    if (!item.original_amount || !item.current_balance) return 100
    return (Number(item.current_balance) / Number(item.original_amount)) * 100
  }

  // Filter items based on search query, location, and filter criteria
  const filteredItems = inventoryItems.filter((item) => {
    // Search filter
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase())

    // Location filter
    const itemLocation = item.locations?.name || ''
    const matchesLocation = currentLocation === "All Locations" || itemLocation === currentLocation

    // Category filter
    const matchesCategory = filterCriteria.categories.length === 0 ||
                           filterCriteria.categories.includes(item.category || '')

    // Unit filter
    const matchesUnit = filterCriteria.units.length === 0 ||
                       filterCriteria.units.includes(item.unit || '')

    // Stock level filter
    let matchesStockLevel = true
    if (filterCriteria.stockLevel !== 'all') {
      const stockPercentage = calculateStockPercentage(item)

      if (filterCriteria.stockLevel === 'low') {
        matchesStockLevel = item.status === 'low'
      } else if (filterCriteria.stockLevel === 'critical') {
        matchesStockLevel = item.status === 'critical'
      } else if (filterCriteria.stockLevel === 'normal') {
        matchesStockLevel = item.status === 'normal' || !item.status
      }

      // Also check stock percentage range
      matchesStockLevel = matchesStockLevel &&
                         stockPercentage >= filterCriteria.minStock &&
                         stockPercentage <= filterCriteria.maxStock
    } else {
      // If 'all' is selected, just check the percentage range
      const stockPercentage = calculateStockPercentage(item)
      matchesStockLevel = stockPercentage >= filterCriteria.minStock &&
                         stockPercentage <= filterCriteria.maxStock
    }

    return matchesSearch && matchesLocation && matchesCategory && matchesUnit && matchesStockLevel
  })

  // Function to refresh all data
  const refreshData = async () => {
    console.log('Refreshing dashboard data...')
    setIsLoading(true)
    try {
      // Fetch inventory items
      const items = await getAllInventoryItems()
      setInventoryItems(items)

      // Fetch low stock items
      const lowItems = await getLowStockItems()
      setLowStockItems(lowItems)

      // Fetch critical stock items
      const criticalItems = await getCriticalStockItems()
      setCriticalStockItems(criticalItems)

      // Fetch activity logs
      const logs = await getRecentActivityLogs(5)
      setActivityLogs(logs)
    } catch (error) {
      console.error('Error refreshing dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle modal close with optional refresh
  const handleModalClose = () => {
    setShowConsumptionModal(false)
    setSelectedItem(null)
    // Refresh data when modal is closed
    refreshData()
  }

  const handleItemClick = (item: InventoryItem) => {
    // Transform the item to match the expected format in the ConsumptionModal
    const formattedItem: Item = {
      id: item.id,
      name: item.name,
      currentBalance: item.current_balance,
      originalAmount: item.original_amount,
      unit: item.unit,
      consumptionUnit: item.consumption_unit,
      location: item.locations?.name || '',
      status: (item.status || 'normal') as 'normal' | 'low' | 'critical'
    }

    setSelectedItem(formattedItem)
    setShowConsumptionModal(true)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-6 w-6" />
            <span className="hidden md:inline-block">SPOG Inventory</span>
          </div>
          <nav className="ml-4 flex items-center gap-4 lg:gap-6">
            <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
              Dashboard
            </Link>
            <Link href="/reports" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Reports
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LocationSelector
              currentLocation={currentLocation}
              setCurrentLocation={setCurrentLocation}
              locations={locations}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{session?.user?.name || 'My Account'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 gap-1 ${isFiltered ? 'bg-primary/20 border-primary' : ''}`}
                    onClick={() => setShowFilterModal(true)}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline-block">
                      {isFiltered ? 'Filtered' : 'Filter'}
                    </span>
                  </Button>

                  {isFiltered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={handleClearFilters}
                    >
                      <span>Clear</span>
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search inventory..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Tabs defaultValue="all">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all">All Items</TabsTrigger>
                  <TabsTrigger value="low">Low Stock</TabsTrigger>
                  <TabsTrigger value="critical">Critical</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="space-y-4">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="opacity-50">
                        <CardHeader className="pb-2">
                          <div className="h-6 w-2/3 animate-pulse rounded bg-muted"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                            <div className="h-2 w-full rounded bg-muted"></div>
                            <div className="flex justify-between">
                              <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                              <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                            </div>
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">No items found. Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleItemClick(item)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{item.name}</CardTitle>
                              <CardDescription>{item.item_code}</CardDescription>
                            </div>
                            <StatusBadge status={item.status || 'normal'} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Current Balance:</span>
                              <span className="font-medium">
                                {item.current_balance} {item.unit}
                              </span>
                            </div>
                            <Progress
                              value={(item.current_balance / item.original_amount) * 100}
                              className={`h-2 ${getProgressColorClass(item.status || 'normal')}`}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0 {item.unit}</span>
                              <span>
                                {item.original_amount} {item.unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Location:</span>
                              <span>{item.locations?.name || 'Unknown'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="low" className="space-y-4">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="opacity-50">
                        <CardHeader className="pb-2">
                          <div className="h-6 w-2/3 animate-pulse rounded bg-muted"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                            <div className="h-2 w-full rounded bg-muted"></div>
                            <div className="flex justify-between">
                              <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                              <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                            </div>
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">No low stock items found.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {lowStockItems
                      .filter(item => {
                        // Apply location filter if not 'All Locations'
                        if (currentLocation === 'All Locations') return true;
                        return item.locations?.name === currentLocation;
                      })
                      .map((item) => (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleItemClick(item)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{item.name}</CardTitle>
                                <CardDescription>{item.item_code}</CardDescription>
                              </div>
                              <StatusBadge status="low" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Current Balance:</span>
                                <span className="font-medium">
                                  {item.current_balance} {item.unit}
                                </span>
                              </div>
                              <Progress
                                value={(item.current_balance / item.original_amount) * 100}
                                className="h-2 bg-amber-100 dark:bg-amber-950"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0 {item.unit}</span>
                                <span>
                                  {item.original_amount} {item.unit}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Location:</span>
                                <span>{item.locations?.name || 'Unknown'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="critical" className="space-y-4">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="opacity-50">
                        <CardHeader className="pb-2">
                          <div className="h-6 w-2/3 animate-pulse rounded bg-muted"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                            <div className="h-2 w-full rounded bg-muted"></div>
                            <div className="flex justify-between">
                              <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                              <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                            </div>
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : criticalStockItems.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">No critical stock items found.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {criticalStockItems
                      .filter(item => {
                        // Apply location filter if not 'All Locations'
                        if (currentLocation === 'All Locations') return true;
                        return item.locations?.name === currentLocation;
                      })
                      .map((item) => (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleItemClick(item)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{item.name}</CardTitle>
                                <CardDescription>{item.item_code}</CardDescription>
                              </div>
                              <StatusBadge status="critical" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Current Balance:</span>
                                <span className="font-medium">
                                  {item.current_balance} {item.unit}
                                </span>
                              </div>
                              <Progress
                                value={(item.current_balance / item.original_amount) * 100}
                                className="h-2 bg-red-100 dark:bg-red-950"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0 {item.unit}</span>
                                <span>
                                  {item.original_amount} {item.unit}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Location:</span>
                                <span>{item.locations?.name || 'Unknown'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                    <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                    <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Items:</span>
                      <span className="font-medium">{inventoryItems.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Low Stock Items:</span>
                      <span className="font-medium">{lowStockItems.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Critical Stock:</span>
                      <span className="font-medium">{criticalStockItems.length}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setShowAddItemModal(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                    <Link href="/reports">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start w-full"
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Reports
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="h-5 w-5 animate-pulse rounded-full bg-muted"></div>
                        <div className="grid w-full gap-1">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
                          <div className="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-muted p-1">
                          <User className="h-3 w-3" />
                        </div>
                        <div className="grid gap-1">
                          <p>
                            <span className="font-medium">{log.users?.username || 'Unknown User'}</span>
                            {' '}{log.action_type === 'consumption' ? 'used' : 'adjusted'}{' '}
                            <span className="font-medium">
                              {log.details?.amount || '?'}{log.details?.unit || log.inventory_items?.consumption_unit || log.inventory_items?.unit || ''}
                            </span>{' '}of{' '}{log.inventory_items?.name || 'Unknown Item'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      {selectedItem && (
        <ConsumptionModal
          item={selectedItem}
          isOpen={showConsumptionModal}
          onClose={handleModalClose}
        />
      )}

      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => {
          setShowAddItemModal(false);
          refreshData(); // Refresh data after adding an item
        }}
      />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        availableCategories={availableCategories}
        availableUnits={availableUnits}
        currentFilters={filterCriteria}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: 'normal' | 'low' | 'critical' }) {
  if (status === "normal") {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-950 dark:text-green-400"
      >
        Normal
      </Badge>
    )
  } else if (status === "low") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 hover:bg-amber-50 dark:bg-amber-950 dark:text-amber-400"
      >
        Low
      </Badge>
    )
  } else if (status === "critical") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 dark:bg-red-950 dark:text-red-400">
        Critical
      </Badge>
    )
  }
  return null
}

function getProgressColorClass(status: 'normal' | 'low' | 'critical'): string {
  if (status === "normal") {
    return "bg-green-100 dark:bg-green-950"
  } else if (status === "low") {
    return "bg-amber-100 dark:bg-amber-950"
  } else if (status === "critical") {
    return "bg-red-100 dark:bg-red-950"
  }
  return ""
}
