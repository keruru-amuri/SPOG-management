"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  ArrowUpDown, 
  Calendar, 
  Filter, 
  Search, 
  TrendingDown, 
  TrendingUp,
  AlertCircle,
  Info
} from "lucide-react";
import { InventoryItem } from "@/lib/supabase";
import { format, subDays, subMonths, parseISO, isWithinInterval, differenceInDays, addDays } from "date-fns";

interface ConsumptionAnomalyProps {
  inventoryItems: InventoryItem[];
  consumptionData: any[];
  isLoading: boolean;
}

export function ConsumptionAnomaly({ inventoryItems, consumptionData, isLoading }: ConsumptionAnomalyProps) {
  // State for time period and filters
  const [timeRange, setTimeRange] = useState<string>("90days");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [anomalyType, setAnomalyType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("severity");
  
  // Calculate date range based on selected time period
  const dateRange = useMemo(() => {
    const to = new Date();
    let from;
    
    switch (timeRange) {
      case "30days":
        from = subDays(to, 30);
        break;
      case "90days":
        from = subDays(to, 90);
        break;
      case "6months":
        from = subMonths(to, 6);
        break;
      case "12months":
        from = subMonths(to, 12);
        break;
      default:
        from = subDays(to, 90);
    }
    
    return { from, to };
  }, [timeRange]);
  
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
  
  // Calculate anomalies
  const anomalies = useMemo(() => {
    // Skip if no data
    if (consumptionData.length === 0 || inventoryItems.length === 0) {
      return [];
    }
    
    // Group consumption data by item and day
    const itemConsumptionByDay = new Map<string, Map<string, number>>();
    
    // Initialize with all items
    inventoryItems.forEach(item => {
      itemConsumptionByDay.set(item.id, new Map<string, number>());
    });
    
    // Fill with consumption data
    consumptionData.forEach(record => {
      try {
        const itemId = record.item_id || record.inventory_item_id;
        if (!itemId) return;
        
        const date = new Date(record.timestamp);
        if (!isWithinInterval(date, dateRange)) return;
        
        const dateStr = format(date, 'yyyy-MM-dd');
        const amount = Number(record.amount);
        
        if (!itemConsumptionByDay.has(itemId)) {
          itemConsumptionByDay.set(itemId, new Map<string, number>());
        }
        
        const itemDayMap = itemConsumptionByDay.get(itemId)!;
        itemDayMap.set(dateStr, (itemDayMap.get(dateStr) || 0) + amount);
      } catch (error) {
        console.error('Error processing consumption record:', error);
      }
    });
    
    // Calculate statistics for each item
    const itemStats = new Map<string, {
      mean: number;
      stdDev: number;
      maxConsumption: number;
      daysWithConsumption: number;
      totalConsumption: number;
    }>();
    
    itemConsumptionByDay.forEach((dayMap, itemId) => {
      if (dayMap.size === 0) return;
      
      const values = Array.from(dayMap.values());
      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / values.length;
      
      // Calculate standard deviation
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
      const stdDev = Math.sqrt(avgSquaredDiff);
      
      const maxConsumption = Math.max(...values);
      
      itemStats.set(itemId, {
        mean,
        stdDev,
        maxConsumption,
        daysWithConsumption: values.length,
        totalConsumption: sum
      });
    });
    
    // Detect anomalies
    const anomalyResults: Array<{
      itemId: string;
      item: InventoryItem;
      date: string;
      amount: number;
      expectedAmount: number;
      deviation: number;
      zScore: number;
      type: 'spike' | 'drop' | 'unusual_pattern';
      severity: 'high' | 'medium' | 'low';
      description: string;
    }> = [];
    
    // Check for consumption spikes and drops
    itemConsumptionByDay.forEach((dayMap, itemId) => {
      const item = inventoryItems.find(i => i.id === itemId);
      if (!item) return;
      
      const stats = itemStats.get(itemId);
      if (!stats || stats.daysWithConsumption < 5) return; // Need enough data for meaningful analysis
      
      // Skip items with very low consumption
      if (stats.totalConsumption < 1) return;
      
      // Check each day's consumption
      dayMap.forEach((amount, dateStr) => {
        const zScore = (amount - stats.mean) / (stats.stdDev || 1); // Avoid division by zero
        
        // Detect significant deviations (Z-score > 2 or < -1)
        if (Math.abs(zScore) > 2 || zScore < -1) {
          let type: 'spike' | 'drop' | 'unusual_pattern';
          let severity: 'high' | 'medium' | 'low';
          let description: string;
          
          if (zScore > 2) {
            type = 'spike';
            severity = zScore > 3 ? 'high' : 'medium';
            description = `Unusually high consumption of ${item.name} on ${format(new Date(dateStr), 'MMM d, yyyy')}. ${amount.toFixed(2)} ${item.unit} consumed, which is ${Math.round(zScore * 100)}% above the average.`;
          } else {
            type = 'drop';
            severity = zScore < -2 ? 'high' : 'low';
            description = `Unusually low consumption of ${item.name} on ${format(new Date(dateStr), 'MMM d, yyyy')}. ${amount.toFixed(2)} ${item.unit} consumed, which is ${Math.round(Math.abs(zScore) * 100)}% below the average.`;
          }
          
          anomalyResults.push({
            itemId,
            item,
            date: dateStr,
            amount,
            expectedAmount: stats.mean,
            deviation: amount - stats.mean,
            zScore,
            type,
            severity,
            description
          });
        }
      });
      
      // Check for unusual patterns (e.g., sudden changes in consumption trend)
      const dates = Array.from(dayMap.keys()).sort();
      if (dates.length > 10) { // Need enough data points for trend analysis
        // Calculate moving average
        const windowSize = 5;
        const movingAverages: { date: string, value: number }[] = [];
        
        for (let i = windowSize - 1; i < dates.length; i++) {
          const windowDates = dates.slice(i - windowSize + 1, i + 1);
          const windowValues = windowDates.map(d => dayMap.get(d) || 0);
          const windowAvg = windowValues.reduce((sum, val) => sum + val, 0) / windowSize;
          
          movingAverages.push({
            date: dates[i],
            value: windowAvg
          });
        }
        
        // Detect significant changes in moving average
        for (let i = 1; i < movingAverages.length; i++) {
          const prevAvg = movingAverages[i - 1].value;
          const currAvg = movingAverages[i].value;
          
          if (prevAvg > 0 && currAvg > 0) {
            const percentChange = (currAvg - prevAvg) / prevAvg;
            
            if (Math.abs(percentChange) > 0.5) { // 50% change in moving average
              const type: 'unusual_pattern' = 'unusual_pattern';
              const severity: 'high' | 'medium' | 'low' = Math.abs(percentChange) > 0.8 ? 'high' : 'medium';
              
              const direction = percentChange > 0 ? 'increase' : 'decrease';
              const description = `Unusual ${direction} in consumption pattern for ${item.name} around ${format(new Date(movingAverages[i].date), 'MMM d, yyyy')}. Consumption ${direction}d by ${Math.round(Math.abs(percentChange) * 100)}% compared to previous period.`;
              
              anomalyResults.push({
                itemId,
                item,
                date: movingAverages[i].date,
                amount: dayMap.get(movingAverages[i].date) || 0,
                expectedAmount: prevAvg,
                deviation: currAvg - prevAvg,
                zScore: percentChange,
                type,
                severity,
                description
              });
            }
          }
        }
      }
    });
    
    return anomalyResults;
  }, [consumptionData, inventoryItems, dateRange]);
  
  // Filter anomalies based on user selections
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(anomaly => {
      // Filter by category
      if (categoryFilter !== 'all' && anomaly.item.category !== categoryFilter) {
        return false;
      }
      
      // Filter by anomaly type
      if (anomalyType !== 'all' && anomaly.type !== anomalyType) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          anomaly.item.name.toLowerCase().includes(query) ||
          anomaly.description.toLowerCase().includes(query)
        );
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by selected criteria
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'item':
          return a.item.name.localeCompare(b.item.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'severity':
          const severityOrder = { high: 0, medium: 1, low: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        case 'deviation':
          return Math.abs(b.deviation) - Math.abs(a.deviation);
        default:
          return 0;
      }
    });
  }, [anomalies, categoryFilter, anomalyType, searchQuery, sortBy]);
  
  // Group anomalies by item for summary
  const anomaliesByItem = useMemo(() => {
    const groupedAnomalies = new Map<string, {
      item: InventoryItem;
      count: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
      types: Set<string>;
    }>();
    
    anomalies.forEach(anomaly => {
      if (!groupedAnomalies.has(anomaly.itemId)) {
        groupedAnomalies.set(anomaly.itemId, {
          item: anomaly.item,
          count: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
          types: new Set<string>()
        });
      }
      
      const itemData = groupedAnomalies.get(anomaly.itemId)!;
      itemData.count++;
      itemData.types.add(anomaly.type);
      
      if (anomaly.severity === 'high') {
        itemData.highSeverity++;
      } else if (anomaly.severity === 'medium') {
        itemData.mediumSeverity++;
      } else {
        itemData.lowSeverity++;
      }
    });
    
    return Array.from(groupedAnomalies.values())
      .sort((a, b) => (b.highSeverity * 3 + b.mediumSeverity * 2 + b.lowSeverity) - 
                      (a.highSeverity * 3 + a.mediumSeverity * 2 + a.lowSeverity));
  }, [anomalies]);
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Consumption Anomaly Detection</h2>
      
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
        <div className="flex">
          <Info className="h-5 w-5 mr-2" />
          <div>
            <p className="font-medium">About Anomaly Detection</p>
            <p className="text-sm mt-1">
              This tool analyzes consumption patterns to identify unusual activity that may indicate issues like waste, theft, or process inefficiencies. 
              Anomalies are detected using statistical methods and are classified by severity.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Anomaly Summary</CardTitle>
            <CardDescription>
              Detected anomalies from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-800/30 dark:bg-red-900/20">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {anomalies.filter(a => a.severity === 'high').length}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">High Severity</div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800/30 dark:bg-amber-900/20">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {anomalies.filter(a => a.severity === 'medium').length}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Medium</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center dark:border-blue-800/30 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {anomalies.filter(a => a.severity === 'low').length}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Low</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Anomaly Types</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-lg font-medium">
                      {anomalies.filter(a => a.type === 'spike').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Spikes</div>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-lg font-medium">
                      {anomalies.filter(a => a.type === 'drop').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Drops</div>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-lg font-medium">
                      {anomalies.filter(a => a.type === 'unusual_pattern').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Patterns</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Time Period</div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Items with Most Anomalies */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Items with Most Anomalies</CardTitle>
            <CardDescription>Items requiring attention due to unusual consumption patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {anomaliesByItem.length > 0 ? (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                {anomaliesByItem.slice(0, 5).map(itemData => (
                  <div key={itemData.item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{itemData.item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {itemData.item.category || "Uncategorized"} • {itemData.count} anomalies detected
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {itemData.highSeverity > 0 && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                            {itemData.highSeverity} High
                          </Badge>
                        )}
                        {itemData.mediumSeverity > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
                            {itemData.mediumSeverity} Med
                          </Badge>
                        )}
                        {itemData.lowSeverity > 0 && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                            {itemData.lowSeverity} Low
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Anomaly types: </span>
                      {Array.from(itemData.types).map(type => (
                        <span key={type} className="capitalize mr-1">
                          {type.replace('_', ' ')}
                          {Array.from(itemData.types).indexOf(type) < Array.from(itemData.types).length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {anomaliesByItem.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    +{anomaliesByItem.length - 5} more items with anomalies
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2">No anomalies detected in the selected time period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Anomaly List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Detected Anomalies</CardTitle>
              <CardDescription>
                {filteredAnomalies.length} anomalies found in the selected time period
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="mr-2 h-4 w-4" />
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
              
              <Select value={anomalyType} onValueChange={setAnomalyType}>
                <SelectTrigger className="w-[130px]">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Anomaly Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="spike">Consumption Spikes</SelectItem>
                  <SelectItem value="drop">Consumption Drops</SelectItem>
                  <SelectItem value="unusual_pattern">Unusual Patterns</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="severity">Sort by Severity</SelectItem>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="item">Sort by Item</SelectItem>
                  <SelectItem value="type">Sort by Type</SelectItem>
                  <SelectItem value="deviation">Sort by Deviation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search anomalies..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {filteredAnomalies.length > 0 ? (
              <div className="space-y-3">
                {filteredAnomalies.map((anomaly, index) => (
                  <div 
                    key={`${anomaly.itemId}-${anomaly.date}-${index}`} 
                    className={`rounded-lg border p-4 ${
                      anomaly.severity === 'high' 
                        ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10' 
                        : anomaly.severity === 'medium'
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10'
                          : 'border-blue-200 bg-blue-50 dark:border-blue-800/30 dark:bg-blue-900/10'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={
                              anomaly.severity === 'high' 
                                ? 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300' 
                                : anomaly.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300'
                            }
                          >
                            {anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)} Severity
                          </Badge>
                          <Badge variant="outline">
                            {anomaly.type === 'spike' 
                              ? 'Consumption Spike' 
                              : anomaly.type === 'drop' 
                                ? 'Consumption Drop' 
                                : 'Unusual Pattern'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(anomaly.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="mt-1 font-medium">{anomaly.item.name}</div>
                        <div className="mt-1 text-sm">{anomaly.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="font-medium">Actual:</span> {anomaly.amount.toFixed(2)} {anomaly.item.unit}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Expected:</span> {anomaly.expectedAmount.toFixed(2)} {anomaly.item.unit}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Deviation:</span> {
                            anomaly.deviation > 0 ? '+' : ''
                          }{anomaly.deviation.toFixed(2)} {anomaly.item.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2">No anomalies found matching your criteria</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
