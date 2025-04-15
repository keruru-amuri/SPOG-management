"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Calendar,
  TrendingDown,
  TrendingUp,
  ArrowUpDown
} from "lucide-react";
import { InventoryItem } from "@/lib/supabase";
import { format, subDays, subMonths, parseISO, isWithinInterval } from "date-fns";

interface ConsumptionByCategoryProps {
  inventoryItems: InventoryItem[];
  consumptionData: any[];
  isLoading: boolean;
}

export function ConsumptionByCategory({ inventoryItems, consumptionData, isLoading }: ConsumptionByCategoryProps) {
  // State for time period and view type
  const [timeRange, setTimeRange] = useState<string>("30days");
  const [viewType, setViewType] = useState<"chart" | "table">("chart");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [sortBy, setSortBy] = useState<string>("amount");

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
        break;
      case "6months":
        from = subMonths(to, 6);
        break;
      case "12months":
        from = subMonths(to, 12);
        break;
      default:
        from = subDays(to, 30);
    }

    return { from, to };
  }, [timeRange]);

  // Filter consumption data by date range
  const filteredConsumptionData = useMemo(() => {
    return consumptionData.filter(record => {
      try {
        const recordDate = new Date(record.timestamp);
        return isWithinInterval(recordDate, dateRange);
      } catch (error) {
        console.error('Error filtering consumption data:', error);
        return false;
      }
    });
  }, [consumptionData, dateRange]);

  // Group consumption data by category
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, {
      totalAmount: number,
      itemCount: number,
      items: Map<string, number>,
      percentChange: number
    }>();

    // Initialize with all categories from inventory items
    inventoryItems.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          totalAmount: 0,
          itemCount: 0,
          items: new Map<string, number>(),
          percentChange: 0
        });
      }
    });

    // Calculate consumption by category for current period
    filteredConsumptionData.forEach(record => {
      try {
        // Get the item and its category
        const item = inventoryItems.find(item =>
          item.id === (record.item_id || record.inventory_item_id)
        );

        if (!item) return;

        const category = item.category || "Uncategorized";
        const amount = Number(record.amount);

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            totalAmount: 0,
            itemCount: 0,
            items: new Map<string, number>(),
            percentChange: 0
          });
        }

        const categoryData = categoryMap.get(category)!;
        categoryData.totalAmount += amount;

        // Track items in this category
        if (!categoryData.items.has(item.id)) {
          categoryData.items.set(item.id, 0);
          categoryData.itemCount++;
        }
        categoryData.items.set(item.id, (categoryData.items.get(item.id) || 0) + amount);
      } catch (error) {
        console.error('Error processing consumption record:', error);
      }
    });

    // Calculate consumption by category for previous period (for trend calculation)
    const previousFrom = new Date(dateRange.from.getTime() - (dateRange.to.getTime() - dateRange.from.getTime()));
    const previousTo = new Date(dateRange.from.getTime() - 1); // 1ms before current period starts

    const previousPeriodData = consumptionData.filter(record => {
      try {
        const recordDate = new Date(record.timestamp);
        return isWithinInterval(recordDate, { from: previousFrom, to: previousTo });
      } catch (error) {
        return false;
      }
    });

    const previousCategoryMap = new Map<string, number>();

    previousPeriodData.forEach(record => {
      try {
        const item = inventoryItems.find(item =>
          item.id === (record.item_id || record.inventory_item_id)
        );

        if (!item) return;

        const category = item.category || "Uncategorized";
        const amount = Number(record.amount);

        previousCategoryMap.set(
          category,
          (previousCategoryMap.get(category) || 0) + amount
        );
      } catch (error) {
        console.error('Error processing previous period record:', error);
      }
    });

    // Calculate percent change
    categoryMap.forEach((data, category) => {
      const previousAmount = previousCategoryMap.get(category) || 0;
      if (previousAmount > 0) {
        data.percentChange = ((data.totalAmount - previousAmount) / previousAmount) * 100;
      } else if (data.totalAmount > 0) {
        data.percentChange = 100; // If no previous consumption, but current consumption exists
      }
    });

    // Convert to array and sort
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        ...data
      }))
      .sort((a, b) => {
        if (sortBy === "amount") {
          return b.totalAmount - a.totalAmount;
        } else if (sortBy === "name") {
          return a.category.localeCompare(b.category);
        } else if (sortBy === "items") {
          return b.itemCount - a.itemCount;
        } else if (sortBy === "trend") {
          return b.percentChange - a.percentChange;
        }
        return 0;
      });
  }, [filteredConsumptionData, inventoryItems, dateRange, sortBy]);

  // Calculate total consumption across all categories
  const totalConsumption = useMemo(() => {
    return categoryData.reduce((sum, category) => sum + category.totalAmount, 0);
  }, [categoryData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Check if we have any categories with consumption
    const categoriesWithConsumption = categoryData.filter(c => isFinite(c.totalAmount) && c.totalAmount > 0);

    if (categoriesWithConsumption.length === 0) {
      return { labels: [], data: [] };
    }

    // Limit to top 5 categories for chart clarity, combine others
    const topCategories = [...categoriesWithConsumption]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    const otherCategories = categoriesWithConsumption.length > 5
      ? categoriesWithConsumption
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(5)
      : [];

    const otherTotal = otherCategories.reduce((sum, category) => sum + (isFinite(category.totalAmount) ? category.totalAmount : 0), 0);

    const labels = topCategories.map(c => c.category);
    const data = topCategories.map(c => isFinite(c.totalAmount) ? c.totalAmount : 0);

    if (otherTotal > 0) {
      labels.push('Other');
      data.push(otherTotal);
    }

    return { labels, data };
  }, [categoryData]);

  // Render bar chart
  const renderBarChart = () => {
    const maxValue = Math.max(...chartData.data);
    const barHeight = 40;
    const barGap = 15;
    const chartHeight = Math.max(300, (barHeight + barGap) * chartData.labels.length);
    const chartWidth = 500;

    // Check if we have valid data
    if (!isFinite(maxValue) || maxValue <= 0) {
      return (
        <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
          <div className="flex flex-col items-center gap-1 text-center">
            <BarChartIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No consumption data available for this period</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-80 w-full">
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
          {chartData.labels.map((label, index) => {
            // Ensure barWidth is a valid number
            const value = chartData.data[index];
            const barWidth = isFinite(value) && value > 0
              ? (value / maxValue) * (chartWidth - 150)
              : 0;

            const y = index * (barHeight + barGap);

            return (
              <g key={label}>
                {/* Bar */}
                <rect
                  x={100}
                  y={y}
                  width={barWidth || 0} // Ensure width is never NaN
                  height={barHeight}
                  fill="hsl(223, 61%, 31%)"
                  rx={4}
                />

                {/* Label */}
                <text
                  x={95}
                  y={y + barHeight / 2 + 5}
                  textAnchor="end"
                  fontSize={14}
                  fill="#64748b"
                >
                  {label}
                </text>

                {/* Value */}
                <text
                  x={(barWidth || 0) + 110}
                  y={y + barHeight / 2 + 5}
                  fontSize={14}
                  fill="#64748b"
                >
                  {isFinite(value) ? value.toFixed(2) : "0.00"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Render pie chart
  const renderPieChart = () => {
    const total = chartData.data.reduce((sum, value) => sum + (isFinite(value) ? value : 0), 0);
    const radius = 100;
    const centerX = 150;
    const centerY = 150;

    // Check if we have valid data
    if (total <= 0) {
      return (
        <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
          <div className="flex flex-col items-center gap-1 text-center">
            <PieChartIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No consumption data available for this period</p>
          </div>
        </div>
      );
    }

    let startAngle = 0;
    const slices = chartData.data.map((value, index) => {
      // Ensure value is a valid number
      const safeValue = isFinite(value) && value > 0 ? value : 0;
      const percentage = safeValue / total;
      const angle = percentage * 360;
      const endAngle = startAngle + angle;

      // Calculate SVG arc path
      const startRadians = (startAngle - 90) * Math.PI / 180;
      const endRadians = (endAngle - 90) * Math.PI / 180;

      const x1 = centerX + radius * Math.cos(startRadians);
      const y1 = centerY + radius * Math.sin(startRadians);
      const x2 = centerX + radius * Math.cos(endRadians);
      const y2 = centerY + radius * Math.sin(endRadians);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      // Calculate label position
      const labelRadians = (startAngle + angle / 2 - 90) * Math.PI / 180;
      const labelDistance = radius * 0.7;
      const labelX = centerX + labelDistance * Math.cos(labelRadians);
      const labelY = centerY + labelDistance * Math.sin(labelRadians);

      // Generate a color based on index
      const hue = (index * 40) % 360;
      const color = `hsl(${hue}, 70%, 50%)`;

      const slice = {
        path: pathData,
        color,
        label: chartData.labels[index],
        value: safeValue,
        percentage,
        labelX,
        labelY,
        startAngle
      };

      startAngle = endAngle;
      return slice;
    }).filter(slice => slice.percentage > 0); // Only include slices with actual data

    return (
      <div className="h-80 w-full flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {slices.map((slice, index) => (
            <g key={index}>
              <path d={slice.path} fill={slice.color} stroke="white" strokeWidth="1" />
              {slice.percentage > 0.05 && (
                <text
                  x={slice.labelX}
                  y={slice.labelY}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="bold"
                >
                  {(slice.percentage * 100).toFixed(0)}%
                </text>
              )}
            </g>
          ))}
        </svg>

        <div className="ml-4 space-y-2">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-3 w-3" style={{ backgroundColor: slice.color }}></div>
              <span className="text-sm">{slice.label} ({slice.value.toFixed(2)})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Consumption by Category</h2>

      <div className="flex flex-wrap gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category Analysis</CardTitle>
                <CardDescription>
                  Consumption breakdown by category from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'MMM d, yyyy')}
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

                <Tabs value={viewType} onValueChange={(value) => setViewType(value as "chart" | "table")}>
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewType === "chart" ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Tabs value={chartType} onValueChange={(value) => setChartType(value as "bar" | "pie")}>
                    <TabsList className="grid w-[120px] grid-cols-2">
                      <TabsTrigger value="bar" className="flex items-center gap-1">
                        <BarChartIcon className="h-4 w-4" />
                        Bar
                      </TabsTrigger>
                      <TabsTrigger value="pie" className="flex items-center gap-1">
                        <PieChartIcon className="h-4 w-4" />
                        Pie
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {chartData.data.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-md border border-dashed">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <BarChartIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No consumption data available for this period</p>
                    </div>
                  </div>
                ) : (
                  chartType === "bar" ? renderBarChart() : renderPieChart()
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {categoryData.length} categories, {totalConsumption.toFixed(2)} total units consumed
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Sort by Amount</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                      <SelectItem value="items">Sort by Item Count</SelectItem>
                      <SelectItem value="trend">Sort by Trend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Items</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Total Consumption</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">% of Total</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryData.map(category => (
                        <tr key={category.category} className="border-b">
                          <td className="px-4 py-3 font-medium">{category.category}</td>
                          <td className="px-4 py-3 text-right">{category.itemCount}</td>
                          <td className="px-4 py-3 text-right">{category.totalAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            {totalConsumption > 0
                              ? ((category.totalAmount / totalConsumption) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            {category.percentChange !== 0 && (
                              <div className="flex items-center justify-end">
                                {category.percentChange > 0 ? (
                                  <Badge className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300">
                                    <TrendingUp className="h-3 w-3" />
                                    +{category.percentChange.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  <Badge className="flex items-center gap-1 bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                                    <TrendingDown className="h-3 w-3" />
                                    {category.percentChange.toFixed(1)}%
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {categoryData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No consumption data available for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Items by Category */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Items by Category</CardTitle>
            <CardDescription>Most consumed items in each category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryData
                .filter(category => category.totalAmount > 0)
                .slice(0, 6)
                .map(category => {
                  // Get top 3 items in this category
                  const topItems = Array.from(category.items.entries())
                    .map(([itemId, amount]) => ({
                      item: inventoryItems.find(item => item.id === itemId),
                      amount
                    }))
                    .filter(entry => entry.item)
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 3);

                  return (
                    <div key={category.category} className="rounded-lg border p-4">
                      <h3 className="font-medium">{category.category}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.totalAmount.toFixed(2)} units consumed
                      </p>
                      <div className="mt-3 space-y-2">
                        {topItems.map(entry => (
                          <div key={entry.item?.id} className="flex items-center justify-between">
                            <span className="text-sm">{entry.item?.name}</span>
                            <span className="text-sm font-medium">{entry.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        {topItems.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            No items consumed in this category
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
