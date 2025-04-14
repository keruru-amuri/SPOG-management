"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
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
import { ConsumptionModal } from "@/components/consumption-modal"
import { LocationSelector } from "@/components/location-selector"

// Mock data for inventory items
const inventoryItems = [
  {
    id: "SP001",
    name: "Silicone Sealant",
    category: "Sealant",
    location: "Storage A",
    currentBalance: 3200,
    originalAmount: 5000,
    unit: "g",
    consumptionUnit: "g",
    status: "normal", // normal, low, critical
  },
  {
    id: "PT002",
    name: "Acrylic Paint - White",
    category: "Paint",
    location: "Storage A",
    currentBalance: 850,
    originalAmount: 5000,
    unit: "ml",
    consumptionUnit: "ml",
    status: "low",
  },
  {
    id: "OL003",
    name: "Hydraulic Oil",
    category: "Oil",
    location: "Storage B",
    currentBalance: 12500,
    originalAmount: 20000,
    unit: "ml",
    consumptionUnit: "ml",
    status: "normal",
  },
  {
    id: "GR004",
    name: "Lithium Grease",
    category: "Grease",
    location: "Storage B",
    currentBalance: 250,
    originalAmount: 1000,
    unit: "g",
    consumptionUnit: "g",
    status: "critical",
  },
  {
    id: "SP005",
    name: "Epoxy Sealant",
    category: "Sealant",
    location: "Storage C",
    currentBalance: 1800,
    originalAmount: 2000,
    unit: "g",
    consumptionUnit: "g",
    status: "normal",
  },
]

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showConsumptionModal, setShowConsumptionModal] = useState(false)
  const [currentLocation, setCurrentLocation] = useState("All Locations")

  // Filter items based on search query and location
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLocation = currentLocation === "All Locations" || item.location === currentLocation
    return matchesSearch && matchesLocation
  })

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
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
          <div className="ml-auto flex items-center gap-2">
            <LocationSelector currentLocation={currentLocation} setCurrentLocation={setCurrentLocation} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline-block">Filter</span>
                </Button>
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
                            <CardDescription>{item.id}</CardDescription>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Current Balance:</span>
                            <span className="font-medium">
                              {item.currentBalance} {item.unit}
                            </span>
                          </div>
                          <Progress
                            value={(item.currentBalance / item.originalAmount) * 100}
                            className={`h-2 ${getProgressColorClass(item.status)}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0 {item.unit}</span>
                            <span>
                              {item.originalAmount} {item.unit}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Location:</span>
                            <span>{item.location}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="low" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems
                    .filter((item) => item.status === "low")
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
                              <CardDescription>{item.id}</CardDescription>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Current Balance:</span>
                              <span className="font-medium">
                                {item.currentBalance} {item.unit}
                              </span>
                            </div>
                            <Progress
                              value={(item.currentBalance / item.originalAmount) * 100}
                              className="h-2 bg-amber-100 dark:bg-amber-950"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0 {item.unit}</span>
                              <span>
                                {item.originalAmount} {item.unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Location:</span>
                              <span>{item.location}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="critical" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems
                    .filter((item) => item.status === "critical")
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
                              <CardDescription>{item.id}</CardDescription>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Current Balance:</span>
                              <span className="font-medium">
                                {item.currentBalance} {item.unit}
                              </span>
                            </div>
                            <Progress
                              value={(item.currentBalance / item.originalAmount) * 100}
                              className="h-2 bg-red-100 dark:bg-red-950"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0 {item.unit}</span>
                              <span>
                                {item.originalAmount} {item.unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Location:</span>
                              <span>{item.location}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{inventoryItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Low Stock Items:</span>
                    <span className="font-medium">{inventoryItems.filter((item) => item.status === "low").length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Critical Stock:</span>
                    <span className="font-medium">
                      {inventoryItems.filter((item) => item.status === "critical").length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Reports
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="rounded-full bg-muted p-1">
                        <User className="h-3 w-3" />
                      </div>
                      <div className="grid gap-1">
                        <p>
                          <span className="font-medium">John Doe</span> used <span className="font-medium">50g</span> of
                          Lithium Grease
                        </p>
                        <p className="text-xs text-muted-foreground">{i * 10} minutes ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      {selectedItem && (
        <ConsumptionModal
          item={selectedItem}
          isOpen={showConsumptionModal}
          onClose={() => setShowConsumptionModal(false)}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
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

function getProgressColorClass(status) {
  if (status === "normal") {
    return "bg-green-100 dark:bg-green-950"
  } else if (status === "low") {
    return "bg-amber-100 dark:bg-amber-950"
  } else if (status === "critical") {
    return "bg-red-100 dark:bg-red-950"
  }
  return ""
}
