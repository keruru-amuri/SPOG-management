"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  Calendar,
  LineChart,
  Search,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { ConsumptionTrendChart } from "./report-charts";
import { InventoryItem } from "@/lib/supabase";
import { format, subDays, addDays, subMonths, parseISO, isWithinInterval } from "date-fns";

interface ConsumptionTrendsProps {
  inventoryItems: InventoryItem[];
  consumptionData: any[];
  isLoading: boolean;
}

export function ConsumptionTrends({ inventoryItems, consumptionData, isLoading }: ConsumptionTrendsProps) {
  // State for selected items and time period
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("30days");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Calculate date range based on selected time period
  const dateRange = useMemo(() => {
    const to = new Date();
    let from;

    switch (timeRange) {
      case "7days":
        from = subDays(to, 7);
        break;
      case "30days":
        from = subDays(to, 30);
        break;
      case "90days":
        from = subDays(to, 90);
        setGroupBy(prev => prev === "day" ? "week" : prev);
        break;
      case "6months":
        from = subMonths(to, 6);
        setGroupBy(prev => prev === "day" ? "week" : prev);
        break;
      case "12months":
        from = subMonths(to, 12);
        setGroupBy("month");
        break;
      default:
        from = subDays(to, 30);
    }

    return { from, to };
  }, [timeRange]);

  // Filter inventory items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return inventoryItems;

    const query = searchQuery.toLowerCase();
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.locations?.name.toLowerCase().includes(query)
    );
  }, [inventoryItems, searchQuery]);

  // Get consumption data for selected items
  const selectedItemsConsumptionData = useMemo(() => {
    if (selectedItemIds.length === 0) return [];

    console.log('Filtering consumption data for selected items:', selectedItemIds);
    console.log('Total consumption data records:', consumptionData.length);

    // Log a sample of consumption data to check structure
    if (consumptionData.length > 0) {
      console.log('Sample consumption data record:', consumptionData[0]);
    }

    // If no consumption data but items are selected, generate sample data for demo
    if (consumptionData.length === 0 && selectedItemIds.length > 0) {
      console.log('No consumption data available, generating sample data for selected items');
      const sampleData = [];

      // Generate 30 days of sample data for each selected item
      const today = new Date();
      const startDate = subDays(today, 30);

      selectedItemIds.forEach((itemId, itemIndex) => {
        const item = inventoryItems.find(i => i.id === itemId);
        if (!item) return;

        // Generate data for each day
        for (let i = 0; i < 30; i++) {
          const date = addDays(startDate, i);

          // Create a consumption pattern (higher on weekdays, lower on weekends)
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const baseAmount = isWeekend ? 2 : 5;
          const randomVariation = Math.random() * 3;

          sampleData.push({
            id: `sample-${itemId}-${i}`,
            inventory_item_id: itemId,
            amount: baseAmount + randomVariation,
            timestamp: format(date, 'yyyy-MM-dd'),
            inventory_items: item
          });
        }
      });

      console.log(`Generated ${sampleData.length} sample consumption records for demo`);
      return sampleData;
    }

    const filtered = consumptionData.filter(record => {
      // Check if record has item_id (from database) or inventory_item_id (from sample data)
      const itemId = record.item_id || record.inventory_item_id;
      if (!itemId) {
        console.log('Record missing item ID:', record);
        return false;
      }

      // Check if record timestamp is valid
      if (!record.timestamp) {
        console.log('Record missing timestamp:', record);
        return false;
      }

      // Check if item is selected
      const isItemSelected = selectedItemIds.includes(itemId);

      // Check if date is within range
      let isDateInRange = false;
      try {
        isDateInRange = isWithinInterval(new Date(record.timestamp), dateRange);
      } catch (error) {
        console.error('Error parsing date:', record.timestamp, error);
      }

      return isItemSelected && isDateInRange;
    });

    // Map the filtered data to a consistent format
    const normalizedData = filtered.map(record => {
      // Handle both database records and sample data
      return {
        id: record.id,
        inventory_item_id: record.item_id || record.inventory_item_id,
        amount: record.amount,
        timestamp: record.timestamp,
        // Include any other fields needed
        inventory_items: record.inventory_items || null
      };
    });

    console.log('Normalized consumption data:', normalizedData.length, 'records');
    return normalizedData;
  }, [consumptionData, selectedItemIds, dateRange, inventoryItems]);

  // Calculate consumption metrics for each selected item
  const itemConsumptionMetrics = useMemo(() => {
    if (selectedItemIds.length === 0) return [];

    return selectedItemIds.map(itemId => {
      const item = inventoryItems.find(i => i.id === itemId);
      if (!item) return null;

      // Get consumption records for this item within date range
      const itemRecords = consumptionData.filter(record =>
        record.inventory_item_id === itemId &&
        isWithinInterval(new Date(record.timestamp), dateRange)
      );

      // Calculate total consumption
      const totalConsumption = itemRecords.reduce((sum, record) => sum + Number(record.amount), 0);

      // Calculate average daily consumption
      const daysDiff = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));
      const avgDailyConsumption = totalConsumption / daysDiff;

      // Calculate trend (compare with previous period)
      const previousFrom = new Date(dateRange.from.getTime() - (dateRange.to.getTime() - dateRange.from.getTime()));
      const previousRecords = consumptionData.filter(record =>
        record.inventory_item_id === itemId &&
        isWithinInterval(new Date(record.timestamp), { from: previousFrom, to: dateRange.from })
      );

      const previousTotalConsumption = previousRecords.reduce((sum, record) => sum + Number(record.amount), 0);

      let trend = 0;
      if (previousTotalConsumption > 0) {
        trend = ((totalConsumption - previousTotalConsumption) / previousTotalConsumption) * 100;
      }

      return {
        id: itemId,
        name: item.name,
        category: item.category || "Uncategorized",
        unit: item.unit,
        totalConsumption,
        avgDailyConsumption,
        trend,
        records: itemRecords
      };
    }).filter(Boolean);
  }, [selectedItemIds, inventoryItems, consumptionData, dateRange]);

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Clear all selected items
  const clearSelection = () => {
    setSelectedItemIds([]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Consumption Trends Analysis</h2>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
        <p className="text-sm">
          <strong>How to use:</strong> Select one or more items from the panel on the left to view their consumption trends over time.
          You can adjust the time range and grouping options to analyze different periods.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Item Selection Panel */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Select Items</CardTitle>
            <CardDescription>Choose items to analyze consumption trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedItemIds.length} items selected
                </span>
                {selectedItemIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear selection
                  </Button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto rounded-md border">
                <div className="divide-y">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50 ${
                        selectedItemIds.includes(item.id) ? 'bg-muted' : ''
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.category || "Uncategorized"} • {item.unit}
                        </div>
                      </div>
                      {selectedItemIds.includes(item.id) && (
                        <Badge variant="outline" className="ml-2">Selected</Badge>
                      )}
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No items found matching your search
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consumption Trends Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Consumption Trends</CardTitle>
                <CardDescription>
                  {selectedItemIds.length === 0
                    ? "Select items to view consumption trends"
                    : `Showing trends from ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}`
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[130px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="6months">Last 6 months</SelectItem>
                    <SelectItem value="12months">Last 12 months</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as "day" | "week" | "month")}>
                  <SelectTrigger className="w-[130px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">By Day</SelectItem>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="month">By Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedItemIds.length === 0 ? (
              <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
                <div className="flex flex-col items-center gap-1 text-center">
                  <LineChart className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select items to view consumption trends</p>
                </div>
              </div>
            ) : selectedItemsConsumptionData.length === 0 ? (
              <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
                <div className="flex flex-col items-center gap-1 text-center">
                  <LineChart className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No consumption data available for selected items</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                {console.log('Selected Items Consumption Data:', selectedItemsConsumptionData)}
                {console.log('Date Range:', dateRange)}
                {console.log('Group By:', groupBy)}
                {selectedItemsConsumptionData.length > 0 ? (
                  <ConsumptionTrendChart
                    consumptionData={selectedItemsConsumptionData}
                    dateRange={dateRange}
                    groupBy={groupBy}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No consumption data for selected items in this date range</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consumption Metrics */}
      {selectedItemIds.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Consumption Metrics</CardTitle>
            <CardDescription>Detailed consumption metrics for selected items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Item</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Total Consumption</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Avg. Daily</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {itemConsumptionMetrics.map(item => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm">{item.category}</td>
                      <td className="px-4 py-3 text-right">
                        {item.totalConsumption.toFixed(2)} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.avgDailyConsumption.toFixed(2)} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end">
                          {item.trend > 0 ? (
                            <Badge className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300">
                              <TrendingUp className="h-3 w-3" />
                              +{item.trend.toFixed(1)}%
                            </Badge>
                          ) : item.trend < 0 ? (
                            <Badge className="flex items-center gap-1 bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                              <TrendingDown className="h-3 w-3" />
                              {item.trend.toFixed(1)}%
                            </Badge>
                          ) : (
                            <Badge className="flex items-center gap-1 bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300">
                              0%
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
