"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Filter, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
    status: "normal",
  },
  {
    id: "PT002",
    name: "Acrylic Paint - White",
    category: "Paint",
    location: "Storage A",
    currentBalance: 850,
    originalAmount: 5000,
    unit: "ml",
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
    status: "critical",
  },
]

export default function BalanceAdjustmentPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentLocation, setCurrentLocation] = useState("All Locations")
  const [selectedItem, setSelectedItem] = useState(null)
  const [newBalance, setNewBalance] = useState("")
  const [reason, setReason] = useState("")

  // Filter items based on search query and location
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLocation = currentLocation === "All Locations" || item.location === currentLocation
    return matchesSearch && matchesLocation
  })

  const handleItemSelect = (item) => {
    setSelectedItem(item)
    setNewBalance(item.currentBalance.toString())
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Here you would handle the adjustment logic
    console.log(`Adjusted ${selectedItem.name} to ${newBalance} ${selectedItem.unit}. Reason: ${reason}`)
    alert("Balance adjusted successfully!")
    setSelectedItem(null)
    setNewBalance("")
    setReason("")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex h-16 items-center px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LocationSelector currentLocation={currentLocation} setCurrentLocation={setCurrentLocation} />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Balance Adjustment</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline-block">Filter</span>
                </Button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedItem?.id === item.id ? "border-primary" : ""}`}
                  onClick={() => handleItemSelect(item)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.id}</p>
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
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{item.location}</span>
                      </div>
                      {selectedItem?.id === item.id && (
                        <div className="flex items-center justify-end pt-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            <Check className="mr-1 h-3 w-3" /> Selected
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Adjust Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">{selectedItem.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {selectedItem.id} | Location: {selectedItem.location}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Current Balance:</span>
                        <span className="font-medium">
                          {selectedItem.currentBalance} {selectedItem.unit}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-balance" className="col-span-4">
                          New Balance ({selectedItem.unit})
                        </Label>
                        <Input
                          id="new-balance"
                          type="number"
                          placeholder={`Enter new amount in ${selectedItem.unit}`}
                          className="col-span-3"
                          value={newBalance}
                          onChange={(e) => setNewBalance(e.target.value)}
                          required
                        />
                        <div className="flex h-10 items-center justify-center rounded-md border bg-muted px-4">
                          {selectedItem.unit}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="reason">Reason for Adjustment</Label>
                        <Select required onValueChange={setReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical-count">Physical Count</SelectItem>
                            <SelectItem value="new-container">New Container</SelectItem>
                            <SelectItem value="calibration">Calibration</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>

                        {reason === "other" && (
                          <Textarea placeholder="Please specify the reason" className="mt-2" required />
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setSelectedItem(null)}>
                        Cancel
                      </Button>
                      <Button type="submit">Update Balance</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex h-[300px] flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground">Select an item from the list to adjust its balance</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
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
