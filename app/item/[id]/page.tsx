"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Edit, History, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsumptionModal } from "@/components/consumption-modal"

// Mock data for a single inventory item
const item = {
  id: "GR004",
  name: "Lithium Grease",
  category: "Grease",
  location: "Storage B",
  currentBalance: 250,
  originalAmount: 1000,
  unit: "g",
  consumptionUnit: "g",
  status: "critical",
  description:
    "Multi-purpose lithium grease for general lubrication of bearings, chassis, and other mechanical components.",
  lastRefilled: "2023-05-15",
  usageHistory: [
    { user: "John Doe", amount: 50, unit: "g", timestamp: "2023-06-01T10:30:00" },
    { user: "Jane Smith", amount: 25, unit: "g", timestamp: "2023-06-02T14:15:00" },
    { user: "Mike Johnson", amount: 75, unit: "g", timestamp: "2023-06-03T09:45:00" },
    { user: "Sarah Williams", amount: 100, unit: "g", timestamp: "2023-06-04T16:20:00" },
    { user: "John Doe", amount: 50, unit: "g", timestamp: "2023-06-05T11:10:00" },
  ],
  adjustmentHistory: [
    { user: "Admin User", newBalance: 800, reason: "Physical count", timestamp: "2023-05-20T08:30:00" },
    { user: "Admin User", newBalance: 550, reason: "Calibration", timestamp: "2023-05-25T13:45:00" },
  ],
}

export default function ItemDetailPage() {
  const [showConsumptionModal, setShowConsumptionModal] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex h-16 items-center px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => setShowConsumptionModal(true)}>
              Record Usage
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
                <p className="text-muted-foreground">
                  ID: {item.id} | Category: {item.category}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{item.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Refilled:</span>
                    <span>{new Date(item.lastRefilled).toLocaleDateString()}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-sm font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="usage">
              <TabsList>
                <TabsTrigger value="usage">Usage History</TabsTrigger>
                <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              </TabsList>
              <TabsContent value="usage" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {item.usageHistory.map((entry, index) => (
                        <div key={index} className="flex items-start gap-4 text-sm">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.user}</span>
                              <span>used</span>
                              <span className="font-medium">
                                {entry.amount} {entry.unit}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="adjustments" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {item.adjustmentHistory.map((entry, index) => (
                        <div key={index} className="flex items-start gap-4 text-sm">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Edit className="h-4 w-4" />
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.user}</span>
                              <span>adjusted balance to</span>
                              <span className="font-medium">
                                {entry.newBalance} {item.unit}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">Reason: {entry.reason}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" onClick={() => setShowConsumptionModal(true)}>
                  Record Usage
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <History className="mr-2 h-4 w-4" />
                  View Full History
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Item Details
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {item.usageHistory.slice(0, 3).map((entry, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="rounded-full bg-muted p-1">
                        <User className="h-3 w-3" />
                      </div>
                      <div className="grid gap-1">
                        <p>
                          <span className="font-medium">{entry.user}</span> used{" "}
                          <span className="font-medium">
                            {entry.amount}
                            {entry.unit}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <ConsumptionModal item={item} isOpen={showConsumptionModal} onClose={() => setShowConsumptionModal(false)} />
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
