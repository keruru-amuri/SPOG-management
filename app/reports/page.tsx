"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { BarChart3, BarChart, PieChart, LineChart, Download, Calendar, Filter, ChartPie, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { InventoryItem } from "@/lib/supabase"
import { getAllInventoryItems } from "@/lib/db/inventory"
import { getConsumptionRecordsByDateRange } from "@/lib/db/consumption"
import { format, parseISO, subDays, addDays, differenceInDays } from "date-fns"
import Link from "next/link"
import {
  ConsumptionTrendChart,
  ConsumptionByCategoryChart,
  StockLevelChart,
  CategoryDistributionChart,
  LocationDistributionChart
} from "@/components/report-charts"
import { ExecutiveDashboard } from "@/components/executive-dashboard"
import { InventoryHealthAnalysis } from "@/components/inventory-health-analysis"
import { ConsumptionTrends } from "@/components/consumption-trends"
import { ConsumptionForecasting } from "@/components/consumption-forecasting"
import { ConsumptionByCategory } from "@/components/consumption-by-category"
import { ConsumptionAnomaly } from "@/components/consumption-anomaly"

// Import report constants
import { REPORT_TYPES, ReportType, REPORT_COMPONENTS, getReportTypeName } from "@/lib/constants/reports"

export default function ReportsPage() {
  const { data: session } = useSession()
  const [reportType, setReportType] = useState<ReportType>(REPORT_TYPES.EXECUTIVE)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()), // Default to last month
    to: new Date()
  })
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [consumptionData, setConsumptionData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week")

  // Fetch data from the database
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch inventory items
        const items = await getAllInventoryItems()
        setInventoryItems(items)

        // Fetch consumption data
        if (dateRange.from && dateRange.to) {
          const fromDate = format(dateRange.from, "yyyy-MM-dd")
          const toDate = format(dateRange.to, "yyyy-MM-dd")
          const consumptionRecords = await getConsumptionRecordsByDateRange(fromDate, toDate)

          console.log('Fetched consumption records:', consumptionRecords.length)

          // Use real consumption data if available, otherwise use sample data
          if (consumptionRecords.length > 0) {
            console.log('Using real consumption data')
            setConsumptionData(consumptionRecords)
          } else {
            console.log('No consumption data found, generating sample data')
            const sampleData = generateSampleConsumptionData(items, dateRange.from, dateRange.to)
            console.log('Sample data generated:', sampleData.length, 'records')
            setConsumptionData(sampleData)
          }
        }
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  // Generate sample consumption data for testing
  const generateSampleConsumptionData = (items: InventoryItem[], startDate: Date, endDate: Date) => {
    const sampleData = [];
    const daysDiff = differenceInDays(endDate, startDate);

    // Ensure we have at least 30 days of data
    const effectiveDaysDiff = Math.max(30, daysDiff);

    // Generate consumption records for each item
    items.forEach((item, itemIndex) => {
      // Generate data for each day
      for (let i = 0; i < effectiveDaysDiff; i++) {
        const date = addDays(startDate, i);

        // Generate 1-3 consumption records for this item on this day
        const recordsCount = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < recordsCount; j++) {
          // Create a consumption pattern (higher on weekdays, lower on weekends)
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const baseAmount = isWeekend ? 2 : 5;
          const randomVariation = Math.random() * 3;

          sampleData.push({
            id: `sample-${itemIndex}-${i}-${j}`,
            inventory_item_id: item.id,
            amount: baseAmount + randomVariation,
            timestamp: format(date, 'yyyy-MM-dd'),
            inventory_items: item
          });
        }
      }
    });

    console.log(`Generated ${sampleData.length} sample consumption records for ${items.length} items`);
    return sampleData;
  };

  // Generate consumption report data
  const consumptionReportData = () => {
    // Group consumption data by item
    const groupedByItem = consumptionData.reduce((acc, record) => {
      const itemId = record.item_id
      if (!acc[itemId]) {
        acc[itemId] = {
          itemId,
          itemName: record.inventory_items?.name || "Unknown Item",
          unit: record.inventory_items?.unit || "",
          totalAmount: 0,
          records: []
        }
      }

      acc[itemId].totalAmount += Number(record.amount)
      acc[itemId].records.push(record)

      return acc
    }, {})

    return Object.values(groupedByItem)
  }

  // Generate inventory status report data
  const inventoryStatusReportData = () => {
    return inventoryItems.map(item => {
      const percentageRemaining = item.current_balance / item.original_amount * 100
      return {
        id: item.id,
        name: item.name,
        currentBalance: item.current_balance,
        originalAmount: item.original_amount,
        unit: item.unit,
        percentageRemaining,
        status: item.status || "normal"
      }
    })
  }

  // Generate category report data
  const categoryReportData = () => {
    const groupedByCategory = inventoryItems.reduce((acc, item) => {
      const category = item.category || "Uncategorized"
      if (!acc[category]) {
        acc[category] = {
          category,
          itemCount: 0,
          totalValue: 0,
          items: []
        }
      }

      acc[category].itemCount += 1
      acc[category].items.push(item)

      return acc
    }, {})

    return Object.values(groupedByCategory)
  }

  // Generate location report data
  const locationReportData = () => {
    const groupedByLocation = inventoryItems.reduce((acc, item) => {
      const locationName = item.locations?.name || "Unknown Location"
      if (!acc[locationName]) {
        acc[locationName] = {
          location: locationName,
          itemCount: 0,
          items: []
        }
      }

      acc[locationName].itemCount += 1
      acc[locationName].items.push(item)

      return acc
    }, {})

    return Object.values(groupedByLocation)
  }

  // Handle export to CSV
  const handleExportCSV = () => {
    let csvContent = ""
    let filename = ""

    if (reportType === "consumption") {
      const data = consumptionReportData()
      csvContent = "Item Name,Unit,Total Amount\n"
      data.forEach(item => {
        csvContent += `"${item.itemName}","${item.unit}",${item.totalAmount}\n`
      })
      filename = `consumption_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`
    } else if (reportType === "inventory") {
      const data = inventoryStatusReportData()
      csvContent = "Item Name,Current Balance,Original Amount,Unit,Percentage Remaining,Status\n"
      data.forEach(item => {
        csvContent += `"${item.name}",${item.currentBalance},${item.originalAmount},"${item.unit}",${item.percentageRemaining.toFixed(2)},"${item.status}"\n`
      })
      filename = `inventory_status_report_${format(new Date(), "yyyy-MM-dd")}.csv`
    } else if (reportType === "category") {
      const data = categoryReportData()
      csvContent = "Category,Item Count\n"
      data.forEach(category => {
        csvContent += `"${category.category}",${category.itemCount}\n`
      })
      filename = `category_report_${format(new Date(), "yyyy-MM-dd")}.csv`
    } else if (reportType === "location") {
      const data = locationReportData()
      csvContent = "Location,Item Count\n"
      data.forEach(location => {
        csvContent += `"${location.location}",${location.itemCount}\n`
      })
      filename = `location_report_${format(new Date(), "yyyy-MM-dd")}.csv`
    }

    // Create a download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Dashboard
            </Link>
            <Link href="/reports" className="text-sm font-medium transition-colors hover:text-primary">
              Reports
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {/* User menu would go here */}
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline-block">Export CSV</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Report Settings</CardTitle>
                <CardDescription>Configure your report parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={REPORT_TYPES.EXECUTIVE}>Executive Dashboard</SelectItem>
                        <SelectItem value={REPORT_TYPES.CONSUMPTION}>Consumption Trends</SelectItem>
                        <SelectItem value={REPORT_TYPES.FORECASTING}>Consumption Forecasting</SelectItem>
                        <SelectItem value={REPORT_TYPES.ANOMALY}>Anomaly Detection</SelectItem>
                        <SelectItem value={REPORT_TYPES.INVENTORY}>Inventory Status</SelectItem>
                        <SelectItem value={REPORT_TYPES.CATEGORY}>Category Analysis</SelectItem>
                        <SelectItem value={REPORT_TYPES.LOCATION}>Location Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                  </div>

                  {reportType === "consumption" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Group By</label>
                      <Select value={groupBy} onValueChange={(value) => setGroupBy(value as "day" | "week" | "month")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grouping" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Daily</SelectItem>
                          <SelectItem value="week">Weekly</SelectItem>
                          <SelectItem value="month">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>
                  {reportType === "executive" && "Executive Dashboard"}
                  {reportType === "consumption" && "Consumption Trends"}
                  {reportType === "forecasting" && "Consumption Forecasting"}
                  {reportType === "inventory" && "Inventory Status"}
                  {reportType === "category" && "Category Analysis"}
                  {reportType === "location" && "Location Analysis"}
                </CardTitle>
                <CardDescription>
                  {reportType === "executive" && "High-level overview of inventory performance metrics"}
                  {reportType === "consumption" && `Showing consumption data from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}`}
                  {reportType === "forecasting" && "Predict future consumption patterns and optimize ordering"}
                  {reportType === "inventory" && "Current inventory status across all items"}
                  {reportType === "category" && "Analysis of inventory by category"}
                  {reportType === "location" && "Analysis of inventory by location"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-muted-foreground">Loading report data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Report content based on type */}
                    {reportType === REPORT_TYPES.EXECUTIVE && (
                      <ExecutiveDashboard
                        inventoryItems={inventoryItems}
                        consumptionData={consumptionData}
                        isLoading={isLoading}
                      />
                    )}

                    {reportType === REPORT_TYPES.CONSUMPTION && (
                      <ConsumptionTrends
                        inventoryItems={inventoryItems}
                        consumptionData={consumptionData}
                        isLoading={isLoading}
                      />
                    )}

                    {reportType === REPORT_TYPES.FORECASTING && (
                      <ConsumptionForecasting
                        inventoryItems={inventoryItems}
                        consumptionData={consumptionData}
                        isLoading={isLoading}
                      />
                    )}

                    {reportType === REPORT_TYPES.ANOMALY && (
                      <ConsumptionAnomaly
                        inventoryItems={inventoryItems}
                        consumptionData={consumptionData}
                        isLoading={isLoading}
                      />
                    )}

                    {false && reportType === "consumption-old" && (
                      <div className="space-y-4">
                        <div className="rounded-lg border">
                          <div className="p-4">
                            <h3 className="text-lg font-medium">Top Consumed Items</h3>
                            <div className="mt-4">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="pb-2 text-left font-medium">Item</th>
                                    <th className="pb-2 text-right font-medium">Total Amount</th>
                                    <th className="pb-2 text-right font-medium">Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {consumptionReportData()
                                    .sort((a, b) => b.totalAmount - a.totalAmount)
                                    .slice(0, 10)
                                    .map((item, index) => (
                                      <tr key={item.itemId} className="border-b last:border-0">
                                        <td className="py-3">{item.itemName}</td>
                                        <td className="py-3 text-right">{item.totalAmount.toFixed(2)}</td>
                                        <td className="py-3 text-right">{item.unit}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border p-4">
                            <h3 className="text-lg font-medium">Consumption Trend</h3>
                            <div className="mt-4 h-60 w-full">
                              {consumptionData.length > 0 ? (
                                <ConsumptionTrendChart
                                  consumptionData={consumptionData}
                                  dateRange={dateRange}
                                  groupBy={groupBy}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-md border border-dashed">
                                  <div className="flex flex-col items-center gap-1 text-center">
                                    <LineChart className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">No consumption data available</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg border p-4">
                            <h3 className="text-lg font-medium">Consumption by Category</h3>
                            <div className="mt-4 h-60 w-full">
                              {consumptionData.length > 0 ? (
                                <ConsumptionByCategoryChart consumptionData={consumptionData} />
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-md border border-dashed">
                                  <div className="flex flex-col items-center gap-1 text-center">
                                    <PieChart className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">No consumption data available</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportType === REPORT_TYPES.INVENTORY && (
                      <InventoryHealthAnalysis
                        inventoryItems={inventoryItems}
                        consumptionData={consumptionData}
                        isLoading={isLoading}
                      />
                    )}

                    {false && reportType === "inventory-old" && (
                      <div className="space-y-4">
                        <div className="rounded-lg border">
                          <div className="p-4">
                            <h3 className="text-lg font-medium">Inventory Status</h3>
                            <div className="mt-4">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="pb-2 text-left font-medium">Item</th>
                                    <th className="pb-2 text-right font-medium">Current</th>
                                    <th className="pb-2 text-right font-medium">Original</th>
                                    <th className="pb-2 text-right font-medium">Unit</th>
                                    <th className="pb-2 text-right font-medium">Remaining %</th>
                                    <th className="pb-2 text-right font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inventoryStatusReportData()
                                    .sort((a, b) => a.percentageRemaining - b.percentageRemaining)
                                    .map((item) => (
                                      <tr key={item.id} className="border-b last:border-0">
                                        <td className="py-3">{item.name}</td>
                                        <td className="py-3 text-right">{item.currentBalance.toFixed(2)}</td>
                                        <td className="py-3 text-right">{item.originalAmount.toFixed(2)}</td>
                                        <td className="py-3 text-right">{item.unit}</td>
                                        <td className="py-3 text-right">{item.percentageRemaining.toFixed(2)}%</td>
                                        <td className="py-3 text-right">
                                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            item.status === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                                            item.status === "low" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                          }`}>
                                            {item.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border p-4">
                            <h3 className="text-lg font-medium">Stock Level Distribution</h3>
                            <div className="mt-4 h-60 w-full">
                              {inventoryItems.length > 0 ? (
                                <StockLevelChart inventoryItems={inventoryItems} />
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-md border border-dashed">
                                  <div className="flex flex-col items-center gap-1 text-center">
                                    <PieChart className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">No inventory data available</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg border p-4">
                            <h3 className="text-lg font-medium">Items Needing Attention</h3>
                            <div className="mt-4">
                              <ul className="space-y-2">
                                {inventoryStatusReportData()
                                  .filter(item => item.status === "critical" || item.status === "low")
                                  .slice(0, 5)
                                  .map(item => (
                                    <li key={item.id} className="flex items-center justify-between rounded-md border p-2">
                                      <span>{item.name}</span>
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        item.status === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                      }`}>
                                        {item.status}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportType === REPORT_TYPES.CATEGORY && (
                      <ConsumptionByCategory
                        inventoryItems={inventoryItems}
                        consumptionData={consumptionData}
                        isLoading={isLoading}
                      />
                    )}

                    {false && reportType === "category-old" && (
                      <div className="space-y-4">
                        <div className="rounded-lg border">
                          <div className="p-4">
                            <h3 className="text-lg font-medium">Category Analysis</h3>
                            <div className="mt-4">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="pb-2 text-left font-medium">Category</th>
                                    <th className="pb-2 text-right font-medium">Item Count</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {categoryReportData()
                                    .sort((a, b) => b.itemCount - a.itemCount)
                                    .map((category, index) => (
                                      <tr key={index} className="border-b last:border-0">
                                        <td className="py-3">{category.category}</td>
                                        <td className="py-3 text-right">{category.itemCount}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h3 className="text-lg font-medium">Category Distribution</h3>
                          <div className="mt-4 h-60 w-full">
                            {inventoryItems.length > 0 ? (
                              <CategoryDistributionChart inventoryItems={inventoryItems} />
                            ) : (
                              <div className="flex h-full items-center justify-center rounded-md border border-dashed">
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <PieChart className="h-8 w-8 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">No category data available</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {reportType === REPORT_TYPES.LOCATION && (
                      <div className="space-y-4">
                        <div className="rounded-lg border">
                          <div className="p-4">
                            <h3 className="text-lg font-medium">Location Analysis</h3>
                            <div className="mt-4">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="pb-2 text-left font-medium">Location</th>
                                    <th className="pb-2 text-right font-medium">Item Count</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {locationReportData()
                                    .sort((a, b) => b.itemCount - a.itemCount)
                                    .map((location, index) => (
                                      <tr key={index} className="border-b last:border-0">
                                        <td className="py-3">{location.location}</td>
                                        <td className="py-3 text-right">{location.itemCount}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h3 className="text-lg font-medium">Location Distribution</h3>
                          <div className="mt-4 h-60 w-full">
                            {inventoryItems.length > 0 ? (
                              <LocationDistributionChart inventoryItems={inventoryItems} />
                            ) : (
                              <div className="flex h-full items-center justify-center rounded-md border border-dashed">
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <PieChart className="h-8 w-8 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">No location data available</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
