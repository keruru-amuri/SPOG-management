"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  Filter, 
  Package, 
  Search, 
  ShoppingCart, 
  TrendingDown, 
  TrendingUp 
} from "lucide-react";
import { StockLevelChart } from "./report-charts";
import { InventoryItem } from "@/lib/supabase";
import { format, subDays, differenceInDays } from "date-fns";

interface InventoryHealthAnalysisProps {
  inventoryItems: InventoryItem[];
  consumptionData: any[];
  isLoading: boolean;
}

export function InventoryHealthAnalysis({ inventoryItems, consumptionData, isLoading }: InventoryHealthAnalysisProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("status");
  
  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    inventoryItems.forEach(item => {
      if (item.category) {
        uniqueCategories.add(item.category);
      }
    });
    return ["all", ...Array.from(uniqueCategories)];
  }, [inventoryItems]);
  
  // Filter and sort inventory items
  const filteredItems = useMemo(() => {
    let filtered = [...inventoryItems];
    
    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category?.toLowerCase().includes(query) ||
        item.locations?.name.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "category":
        filtered.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
      case "quantity":
        filtered.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
        break;
      case "status":
        filtered.sort((a, b) => {
          const statusOrder = { critical: 0, low: 1, normal: 2 };
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        });
        break;
      case "daysOfSupply":
        filtered.sort((a, b) => calculateDaysOfSupply(a) - calculateDaysOfSupply(b));
        break;
    }
    
    return filtered;
  }, [inventoryItems, categoryFilter, searchQuery, sortBy]);
  
  // Calculate stock level counts
  const stockLevelCounts = useMemo(() => {
    const counts = {
      normal: inventoryItems.filter(item => item.status === 'normal').length,
      low: inventoryItems.filter(item => item.status === 'low').length,
      critical: inventoryItems.filter(item => item.status === 'critical').length,
    };
    
    const total = inventoryItems.length;
    
    return {
      counts,
      percentages: {
        normal: total > 0 ? (counts.normal / total) * 100 : 0,
        low: total > 0 ? (counts.low / total) * 100 : 0,
        critical: total > 0 ? (counts.critical / total) * 100 : 0,
      }
    };
  }, [inventoryItems]);
  
  // Calculate days of supply for an item
  function calculateDaysOfSupply(item: InventoryItem): number {
    // Get consumption records for this item
    const itemConsumption = consumptionData.filter(record => record.inventory_item_id === item.id);
    
    // If no consumption data, return a high number
    if (itemConsumption.length === 0) return 999;
    
    // Calculate daily consumption rate (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentConsumption = itemConsumption.filter(record => 
      new Date(record.timestamp) >= thirtyDaysAgo
    );
    
    const totalConsumed = recentConsumption.reduce((sum, record) => sum + Number(record.amount), 0);
    const dailyRate = totalConsumed / 30;
    
    // If daily rate is zero, return a high number
    if (dailyRate === 0) return 999;
    
    // Calculate days of supply
    return Math.round((item.current_balance || 0) / dailyRate);
  }
  
  // Get items approaching reorder point
  const itemsApproachingReorder = useMemo(() => {
    return inventoryItems
      .filter(item => item.status === 'normal' && item.min_threshold)
      .map(item => {
        const daysOfSupply = calculateDaysOfSupply(item);
        const percentageToReorder = item.min_threshold 
          ? ((item.current_balance - item.min_threshold) / (item.max_balance - item.min_threshold)) * 100
          : 100;
        
        return {
          ...item,
          daysOfSupply,
          percentageToReorder: Math.max(0, Math.min(100, percentageToReorder))
        };
      })
      .filter(item => item.percentageToReorder < 30) // Items within 30% of reorder point
      .sort((a, b) => a.percentageToReorder - b.percentageToReorder);
  }, [inventoryItems]);
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventory Health Analysis</h2>
      
      {/* Stock Level Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Stock Level Distribution</CardTitle>
            <CardDescription>Current inventory status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-60">
                <StockLevelChart inventoryItems={inventoryItems} />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">Normal Stock</span>
                    <span className="text-sm font-medium text-green-600">
                      {stockLevelCounts.counts.normal} items ({stockLevelCounts.percentages.normal.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={stockLevelCounts.percentages.normal} className="h-2" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">Low Stock</span>
                    <span className="text-sm font-medium text-amber-600">
                      {stockLevelCounts.counts.low} items ({stockLevelCounts.percentages.low.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={stockLevelCounts.percentages.low} className="h-2" indicatorClassName="bg-amber-500" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">Critical Stock</span>
                    <span className="text-sm font-medium text-destructive">
                      {stockLevelCounts.counts.critical} items ({stockLevelCounts.percentages.critical.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={stockLevelCounts.percentages.critical} className="h-2" indicatorClassName="bg-destructive" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Items Approaching Reorder Point */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Approaching Reorder Point</CardTitle>
            <CardDescription>Items that will need reordering soon</CardDescription>
          </CardHeader>
          <CardContent>
            {itemsApproachingReorder.length > 0 ? (
              <div className="max-h-60 space-y-3 overflow-auto">
                {itemsApproachingReorder.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.current_balance} {item.unit} remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{item.daysOfSupply === 999 ? "∞" : item.daysOfSupply} days</span>
                      </div>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-muted">
                        <div 
                          className="h-full rounded-full bg-amber-500" 
                          style={{ width: `${item.percentageToReorder}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {itemsApproachingReorder.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    +{itemsApproachingReorder.length - 5} more items approaching reorder point
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-60 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2">No items approaching reorder point</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Inventory Items Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Detailed view of all inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1">
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
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Sort by Status</SelectItem>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="category">Sort by Category</SelectItem>
                  <SelectItem value="quantity">Sort by Quantity</SelectItem>
                  <SelectItem value="daysOfSupply">Sort by Days of Supply</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Items Table */}
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Item</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Current Stock</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Days of Supply</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => {
                      const daysOfSupply = calculateDaysOfSupply(item);
                      return (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.locations?.name || "No location"}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{item.category || "Uncategorized"}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-medium">{item.current_balance} {item.unit}</div>
                            {item.min_threshold && (
                              <div className="text-xs text-muted-foreground">
                                Min: {item.min_threshold} / Max: {item.max_balance}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{daysOfSupply === 999 ? "∞" : daysOfSupply}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={
                              item.status === "critical" ? "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300" :
                              item.status === "low" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300" :
                              "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                            }>
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No items found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
