"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  ArrowDown, 
  ArrowUp, 
  BarChart3, 
  Clock, 
  DollarSign, 
  LineChart, 
  Package, 
  Percent, 
  RefreshCcw, 
  ShoppingCart 
} from "lucide-react";
import { ConsumptionTrendChart } from "./report-charts";
import { InventoryItem } from "@/lib/supabase";
import { format, subDays } from "date-fns";

interface ExecutiveDashboardProps {
  inventoryItems: InventoryItem[];
  consumptionData: any[];
  isLoading: boolean;
}

export function ExecutiveDashboard({ inventoryItems, consumptionData, isLoading }: ExecutiveDashboardProps) {
  // Calculate inventory health metrics
  const totalItems = inventoryItems.length;
  const lowStockItems = inventoryItems.filter(item => item.status === 'low');
  const criticalStockItems = inventoryItems.filter(item => item.status === 'critical');
  const lowStockPercentage = totalItems > 0 ? (lowStockItems.length / totalItems) * 100 : 0;
  const criticalStockPercentage = totalItems > 0 ? (criticalStockItems.length / totalItems) * 100 : 0;
  const healthyStockPercentage = 100 - lowStockPercentage - criticalStockPercentage;

  // Calculate consumption metrics
  const last30DaysConsumption = consumptionData.filter(record => {
    const recordDate = new Date(record.timestamp);
    const thirtyDaysAgo = subDays(new Date(), 30);
    return recordDate >= thirtyDaysAgo;
  });

  const last60DaysConsumption = consumptionData.filter(record => {
    const recordDate = new Date(record.timestamp);
    const sixtyDaysAgo = subDays(new Date(), 60);
    const thirtyDaysAgo = subDays(new Date(), 30);
    return recordDate >= sixtyDaysAgo && recordDate < thirtyDaysAgo;
  });

  // Calculate consumption trend (last 30 days vs previous 30 days)
  const last30DaysTotal = last30DaysConsumption.reduce((total, record) => total + Number(record.amount), 0);
  const previous30DaysTotal = last60DaysConsumption.reduce((total, record) => total + Number(record.amount), 0);
  
  const consumptionTrend = previous30DaysTotal > 0 
    ? ((last30DaysTotal - previous30DaysTotal) / previous30DaysTotal) * 100 
    : 0;

  // Calculate inventory turnover rate (simplified)
  const turnoverRate = last30DaysTotal > 0 && totalItems > 0 
    ? (last30DaysTotal / totalItems).toFixed(2) 
    : "N/A";

  // Calculate average days of supply (simplified)
  const averageDaysOfSupply = last30DaysConsumption.length > 0 
    ? Math.round((totalItems / (last30DaysTotal / 30)) || 0) 
    : "N/A";

  // Calculate fill rate (simplified - assuming all consumption requests were fulfilled)
  const fillRate = "100%";

  // Date range for consumption trend chart
  const dateRange = {
    from: subDays(new Date(), 30),
    to: new Date()
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Executive Dashboard</h2>
      
      {/* Inventory Health Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Inventory Health Summary</CardTitle>
          <CardDescription>Overview of current inventory status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Items</span>
                <span className="font-bold">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Low Stock Items</span>
                <span className="font-bold text-amber-500">{lowStockItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Critical Stock</span>
                <span className="font-bold text-destructive">{criticalStockItems.length}</span>
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Healthy</span>
                  <span>{healthyStockPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={healthyStockPercentage} className="h-2 bg-muted" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Low Stock</span>
                  <span>{lowStockPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={lowStockPercentage} className="h-2 bg-amber-200" indicatorClassName="bg-amber-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Critical</span>
                  <span>{criticalStockPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={criticalStockPercentage} className="h-2 bg-red-200" indicatorClassName="bg-destructive" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Items Alert Panel */}
      {criticalStockItems.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Stock Alert</AlertTitle>
          <AlertDescription>
            {criticalStockItems.length} items require immediate attention
            <div className="mt-2 max-h-40 overflow-auto">
              <ul className="space-y-1">
                {criticalStockItems.map(item => (
                  <li key={item.id} className="text-sm">
                    <span className="font-medium">{item.name}</span>: {item.current_balance} {item.unit} remaining
                    {item.min_threshold && (
                      <span className="ml-2 text-xs">
                        (Threshold: {item.critical_threshold} {item.unit})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Performance Indicators */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Consumption Trend</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{Math.abs(consumptionTrend).toFixed(1)}%</span>
                  {consumptionTrend > 0 ? (
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      Up
                    </Badge>
                  ) : consumptionTrend < 0 ? (
                    <Badge variant="outline" className="ml-2 bg-red-50 text-red-700">
                      <ArrowDown className="mr-1 h-3 w-3" />
                      Down
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      <RefreshCcw className="mr-1 h-3 w-3" />
                      Stable
                    </Badge>
                  )}
                </div>
              </div>
              <LineChart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Compared to previous 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Inventory Turnover</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{turnoverRate}</span>
                </div>
              </div>
              <RefreshCcw className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Items consumed per item in stock (monthly)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Avg. Days of Supply</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{averageDaysOfSupply}</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Based on current consumption rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Fill Rate</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{fillRate}</span>
                </div>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Percentage of demand met from stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Consumption Trend Snapshot */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Consumption Trend</CardTitle>
          <CardDescription>Last 30 days consumption pattern</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {consumptionData.length > 0 ? (
              <ConsumptionTrendChart
                consumptionData={consumptionData}
                dateRange={dateRange}
                groupBy="day"
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
        </CardContent>
      </Card>
    </div>
  );
}
