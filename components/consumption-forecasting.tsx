"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  LineChart, 
  Search, 
  TrendingDown, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { InventoryItem } from "@/lib/supabase";
import { format, addDays, subDays, subMonths, parseISO, isWithinInterval, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

interface ConsumptionForecastingProps {
  inventoryItems: InventoryItem[];
  consumptionData: any[];
  isLoading: boolean;
}

export function ConsumptionForecasting({ inventoryItems, consumptionData, isLoading }: ConsumptionForecastingProps) {
  // State for selected item and forecast settings
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [forecastPeriod, setForecastPeriod] = useState<string>("30days");
  const [historyPeriod, setHistoryPeriod] = useState<string>("90days");
  const [forecastMethod, setForecastMethod] = useState<string>("movingAverage");
  
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
  
  // Get selected item
  const selectedItem = useMemo(() => {
    return inventoryItems.find(item => item.id === selectedItemId);
  }, [inventoryItems, selectedItemId]);
  
  // Calculate history date range
  const historyDateRange = useMemo(() => {
    const to = new Date();
    let from;
    
    switch (historyPeriod) {
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
  }, [historyPeriod]);
  
  // Calculate forecast date range
  const forecastDateRange = useMemo(() => {
    const from = new Date();
    let to;
    
    switch (forecastPeriod) {
      case "7days":
        to = addDays(from, 7);
        break;
      case "30days":
        to = addDays(from, 30);
        break;
      case "90days":
        to = addDays(from, 90);
        break;
      case "6months":
        to = addDays(from, 180);
        break;
      default:
        to = addDays(from, 30);
    }
    
    return { from, to };
  }, [forecastPeriod]);
  
  // Get historical consumption data for selected item
  const itemHistoricalData = useMemo(() => {
    if (!selectedItemId) return [];
    
    return consumptionData
      .filter(record => 
        record.inventory_item_id === selectedItemId &&
        isWithinInterval(new Date(record.timestamp), historyDateRange)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [consumptionData, selectedItemId, historyDateRange]);
  
  // Generate forecast data
  const forecastData = useMemo(() => {
    if (!selectedItemId || itemHistoricalData.length === 0) return [];
    
    // Group historical data by day
    const dailyConsumption: Record<string, number> = {};
    
    itemHistoricalData.forEach(record => {
      const date = format(new Date(record.timestamp), 'yyyy-MM-dd');
      if (!dailyConsumption[date]) {
        dailyConsumption[date] = 0;
      }
      dailyConsumption[date] += Number(record.amount);
    });
    
    // Calculate average daily consumption
    const totalConsumption = Object.values(dailyConsumption).reduce((sum, amount) => sum + amount, 0);
    const daysWithConsumption = Object.keys(dailyConsumption).length;
    const avgDailyConsumption = daysWithConsumption > 0 ? totalConsumption / daysWithConsumption : 0;
    
    // Generate forecast based on selected method
    const forecastDays = differenceInDays(forecastDateRange.to, forecastDateRange.from);
    const forecast = [];
    
    if (forecastMethod === "movingAverage") {
      // Simple moving average forecast
      for (let i = 0; i < forecastDays; i++) {
        const date = addDays(forecastDateRange.from, i);
        forecast.push({
          date,
          amount: avgDailyConsumption,
          isActual: false
        });
      }
    } else if (forecastMethod === "weighted") {
      // Weighted moving average (more recent data has higher weight)
      const recentDays = Math.min(30, daysWithConsumption);
      const recentDates = Object.keys(dailyConsumption)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, recentDays);
      
      const recentAvg = recentDates.reduce((sum, date, index) => {
        const weight = recentDays - index;
        return sum + (dailyConsumption[date] * weight);
      }, 0) / recentDates.reduce((sum, _, index) => sum + (recentDays - index), 0);
      
      for (let i = 0; i < forecastDays; i++) {
        const date = addDays(forecastDateRange.from, i);
        forecast.push({
          date,
          amount: recentAvg,
          isActual: false
        });
      }
    } else if (forecastMethod === "seasonal") {
      // Simple seasonal forecast (based on day of week patterns)
      const dayOfWeekAvg: Record<number, { sum: number, count: number }> = {
        0: { sum: 0, count: 0 }, // Sunday
        1: { sum: 0, count: 0 },
        2: { sum: 0, count: 0 },
        3: { sum: 0, count: 0 },
        4: { sum: 0, count: 0 },
        5: { sum: 0, count: 0 },
        6: { sum: 0, count: 0 }  // Saturday
      };
      
      // Calculate average consumption by day of week
      Object.entries(dailyConsumption).forEach(([dateStr, amount]) => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        dayOfWeekAvg[dayOfWeek].sum += amount;
        dayOfWeekAvg[dayOfWeek].count += 1;
      });
      
      // Generate forecast using day of week pattern
      for (let i = 0; i < forecastDays; i++) {
        const date = addDays(forecastDateRange.from, i);
        const dayOfWeek = date.getDay();
        const avg = dayOfWeekAvg[dayOfWeek].count > 0 
          ? dayOfWeekAvg[dayOfWeek].sum / dayOfWeekAvg[dayOfWeek].count 
          : avgDailyConsumption;
        
        forecast.push({
          date,
          amount: avg,
          isActual: false
        });
      }
    }
    
    // Add historical data for chart
    const historical = Object.entries(dailyConsumption).map(([dateStr, amount]) => ({
      date: new Date(dateStr),
      amount,
      isActual: true
    }));
    
    return [...historical, ...forecast].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedItemId, itemHistoricalData, forecastDateRange, forecastMethod, historyDateRange]);
  
  // Calculate forecast metrics
  const forecastMetrics = useMemo(() => {
    if (!selectedItemId || !selectedItem || forecastData.length === 0) return null;
    
    // Filter to just the forecast portion
    const forecastOnly = forecastData.filter(d => !d.isActual);
    
    // Calculate total forecasted consumption
    const totalForecast = forecastOnly.reduce((sum, d) => sum + d.amount, 0);
    
    // Calculate days until reorder point
    const currentStock = selectedItem.current_balance || 0;
    const minThreshold = selectedItem.min_threshold || 0;
    const availableStock = currentStock - minThreshold;
    
    let cumulativeConsumption = 0;
    let daysUntilReorder = forecastOnly.length;
    
    for (let i = 0; i < forecastOnly.length; i++) {
      cumulativeConsumption += forecastOnly[i].amount;
      if (cumulativeConsumption >= availableStock) {
        daysUntilReorder = i + 1;
        break;
      }
    }
    
    // Calculate recommended order quantity
    const maxStock = selectedItem.max_balance || (currentStock * 2);
    const recommendedOrder = Math.max(0, maxStock - (currentStock - cumulativeConsumption));
    
    return {
      totalForecast,
      daysUntilReorder,
      recommendedOrder,
      stockOutDate: daysUntilReorder < forecastOnly.length 
        ? addDays(new Date(), daysUntilReorder)
        : null
    };
  }, [selectedItemId, selectedItem, forecastData]);
  
  // Render chart data
  const renderChart = () => {
    if (!selectedItemId) {
      return (
        <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
          <div className="flex flex-col items-center gap-1 text-center">
            <LineChart className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select an item to view consumption forecast</p>
          </div>
        </div>
      );
    }
    
    if (itemHistoricalData.length === 0) {
      return (
        <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
          <div className="flex flex-col items-center gap-1 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No historical consumption data available for this item</p>
          </div>
        </div>
      );
    }
    
    // Simple chart rendering with SVG
    const chartHeight = 300;
    const chartWidth = 800;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };
    
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    
    // Find min and max dates
    const dates = forecastData.map(d => d.date);
    const minDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);
    const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0]);
    
    // Find max amount for y-scale
    const maxAmount = Math.max(...forecastData.map(d => d.amount)) * 1.2;
    
    // Create scales
    const xScale = (date: Date) => {
      const range = maxDate.getTime() - minDate.getTime();
      const percent = (date.getTime() - minDate.getTime()) / range;
      return padding.left + (percent * innerWidth);
    };
    
    const yScale = (amount: number) => {
      return chartHeight - padding.bottom - (amount / maxAmount * innerHeight);
    };
    
    // Generate path for historical data
    const historicalData = forecastData.filter(d => d.isActual);
    let historicalPath = "";
    
    historicalData.forEach((d, i) => {
      const x = xScale(d.date);
      const y = yScale(d.amount);
      historicalPath += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    });
    
    // Generate path for forecast data
    const futureForecast = forecastData.filter(d => !d.isActual);
    let forecastPath = "";
    
    if (historicalData.length > 0 && futureForecast.length > 0) {
      // Start from the last historical point
      const lastHistorical = historicalData[historicalData.length - 1];
      forecastPath = `M ${xScale(lastHistorical.date)},${yScale(lastHistorical.amount)}`;
      
      futureForecast.forEach(d => {
        forecastPath += ` L ${xScale(d.date)},${yScale(d.amount)}`;
      });
    } else if (futureForecast.length > 0) {
      futureForecast.forEach((d, i) => {
        const x = xScale(d.date);
        const y = yScale(d.amount);
        forecastPath += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
      });
    }
    
    // Generate x-axis ticks
    const xTicks = [];
    const tickCount = 6;
    const dateRange = maxDate.getTime() - minDate.getTime();
    
    for (let i = 0; i < tickCount; i++) {
      const tickDate = new Date(minDate.getTime() + (dateRange * (i / (tickCount - 1))));
      xTicks.push({
        date: tickDate,
        x: xScale(tickDate),
        label: format(tickDate, 'MMM d')
      });
    }
    
    // Generate y-axis ticks
    const yTicks = [];
    const yTickCount = 5;
    
    for (let i = 0; i < yTickCount; i++) {
      const tickValue = (maxAmount * i) / (yTickCount - 1);
      yTicks.push({
        value: tickValue,
        y: yScale(tickValue),
        label: tickValue.toFixed(1)
      });
    }
    
    // Draw the chart
    return (
      <div className="relative h-80 w-full overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
          {/* X-axis */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          
          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          
          {/* X-axis ticks */}
          {xTicks.map((tick, i) => (
            <g key={`x-tick-${i}`}>
              <line
                x1={tick.x}
                y1={chartHeight - padding.bottom}
                x2={tick.x}
                y2={chartHeight - padding.bottom + 5}
                stroke="#94a3b8"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
              >
                {tick.label}
              </text>
            </g>
          ))}
          
          {/* Y-axis ticks */}
          {yTicks.map((tick, i) => (
            <g key={`y-tick-${i}`}>
              <line
                x1={padding.left - 5}
                y1={tick.y}
                x2={padding.left}
                y2={tick.y}
                stroke="#94a3b8"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
              >
                {tick.label}
              </text>
              {/* Horizontal grid line */}
              <line
                x1={padding.left}
                y1={tick.y}
                x2={chartWidth - padding.right}
                y2={tick.y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            </g>
          ))}
          
          {/* Historical data line */}
          <path
            d={historicalPath}
            fill="none"
            stroke="hsl(223, 61%, 31%)"
            strokeWidth="2"
          />
          
          {/* Forecast data line */}
          <path
            d={forecastPath}
            fill="none"
            stroke="hsl(223, 61%, 31%)"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
          
          {/* Data points for historical data */}
          {historicalData.map((d, i) => (
            <circle
              key={`point-${i}`}
              cx={xScale(d.date)}
              cy={yScale(d.amount)}
              r="3"
              fill="hsl(223, 61%, 31%)"
            />
          ))}
          
          {/* Divider line between historical and forecast */}
          {historicalData.length > 0 && futureForecast.length > 0 && (
            <line
              x1={xScale(historicalData[historicalData.length - 1].date)}
              y1={padding.top}
              x2={xScale(historicalData[historicalData.length - 1].date)}
              y2={chartHeight - padding.bottom}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}
          
          {/* Reorder point indicator */}
          {forecastMetrics && forecastMetrics.stockOutDate && (
            <line
              x1={xScale(forecastMetrics.stockOutDate)}
              y1={padding.top}
              x2={xScale(forecastMetrics.stockOutDate)}
              y2={chartHeight - padding.bottom}
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          )}
          
          {/* Axis labels */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            fontSize="14"
            fill="#64748b"
          >
            Date
          </text>
          
          <text
            x={-chartHeight / 2}
            y={15}
            textAnchor="middle"
            fontSize="14"
            fill="#64748b"
            transform="rotate(-90)"
          >
            Consumption ({selectedItem?.unit})
          </text>
          
          {/* Legend */}
          <g transform={`translate(${chartWidth - padding.right - 150}, ${padding.top + 10})`}>
            <rect width="150" height="60" fill="white" fillOpacity="0.8" rx="4" />
            
            <line x1="10" y1="15" x2="30" y2="15" stroke="hsl(223, 61%, 31%)" strokeWidth="2" />
            <text x="40" y="19" fontSize="12" fill="#64748b">Historical Data</text>
            
            <line x1="10" y1="35" x2="30" y2="35" stroke="hsl(223, 61%, 31%)" strokeWidth="2" strokeDasharray="4,4" />
            <text x="40" y="39" fontSize="12" fill="#64748b">Forecast</text>
            
            <line x1="10" y1="55" x2="30" y2="55" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4,4" />
            <text x="40" y="59" fontSize="12" fill="#64748b">Reorder Point</text>
          </g>
        </svg>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Consumption Forecasting</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Item Selection Panel */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Select Item</CardTitle>
            <CardDescription>Choose an item to forecast consumption</CardDescription>
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
              
              <div className="max-h-[400px] overflow-y-auto rounded-md border">
                <div className="divide-y">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50 ${
                        selectedItemId === item.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.category || "Uncategorized"} • {item.unit}
                        </div>
                      </div>
                      {selectedItemId === item.id && (
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
        
        {/* Forecast Settings */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Forecast Settings</CardTitle>
            <CardDescription>Configure forecast parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Forecast Method</label>
                <Select value={forecastMethod} onValueChange={setForecastMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movingAverage">Simple Moving Average</SelectItem>
                    <SelectItem value="weighted">Weighted Moving Average</SelectItem>
                    <SelectItem value="seasonal">Seasonal Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Historical Data Period</label>
                <Select value={historyPeriod} onValueChange={setHistoryPeriod}>
                  <SelectTrigger>
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
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Forecast Period</label>
                <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Next 7 Days</SelectItem>
                    <SelectItem value="30days">Next 30 Days</SelectItem>
                    <SelectItem value="90days">Next 90 Days</SelectItem>
                    <SelectItem value="6months">Next 6 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Forecast Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Consumption Forecast</CardTitle>
          <CardDescription>
            {selectedItem 
              ? `Forecast for ${selectedItem.name} (${selectedItem.unit})`
              : "Select an item to view consumption forecast"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
      
      {/* Forecast Metrics */}
      {selectedItem && forecastMetrics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Forecast Insights</CardTitle>
            <CardDescription>Key metrics and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">Current Stock</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedItem.current_balance} {selectedItem.unit}
                </div>
                {selectedItem.min_threshold && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Min: {selectedItem.min_threshold} / Max: {selectedItem.max_balance}
                  </div>
                )}
              </div>
              
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">Forecasted Consumption</div>
                <div className="mt-1 text-2xl font-bold">
                  {forecastMetrics.totalForecast.toFixed(2)} {selectedItem.unit}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Over next {differenceInDays(forecastDateRange.to, forecastDateRange.from)} days
                </div>
              </div>
              
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">Days Until Reorder</div>
                <div className="mt-1 text-2xl font-bold">
                  {forecastMetrics.daysUntilReorder}
                </div>
                {forecastMetrics.stockOutDate && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Reorder by: {format(forecastMetrics.stockOutDate, 'MMM d, yyyy')}
                  </div>
                )}
              </div>
              
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">Recommended Order</div>
                <div className="mt-1 text-2xl font-bold">
                  {forecastMetrics.recommendedOrder.toFixed(2)} {selectedItem.unit}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  To reach optimal stock level
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
