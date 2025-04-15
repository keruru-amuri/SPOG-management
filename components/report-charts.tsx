"use client"

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { format, parseISO, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Common chart options
const commonOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

// Generate theme-based colors for charts
const generateColors = (count: number) => {
  const colors = [];
  const backgroundColors = [];

  // Use theme chart colors
  const themeColors = [
    'hsl(223, 61%, 31%)', // chart-1
    'hsl(193, 61%, 31%)', // chart-2
    'hsl(253, 61%, 31%)', // chart-3
    'hsl(193, 61%, 34%)', // chart-4
    'hsl(223, 64%, 31%)' // chart-5
  ];

  const themeBackgroundColors = [
    'hsla(223, 61%, 31%, 0.7)', // chart-1
    'hsla(193, 61%, 31%, 0.7)', // chart-2
    'hsla(253, 61%, 31%, 0.7)', // chart-3
    'hsla(193, 61%, 34%, 0.7)', // chart-4
    'hsla(223, 64%, 31%, 0.7)' // chart-5
  ];

  for (let i = 0; i < count; i++) {
    // Use modulo to cycle through the theme colors if count > themeColors.length
    const index = i % themeColors.length;
    colors.push(themeColors[index]);
    backgroundColors.push(themeBackgroundColors[index]);
  }

  return { colors, backgroundColors };
};

// Consumption Trend Chart
interface ConsumptionTrendChartProps {
  consumptionData: any[];
  dateRange: { from: Date; to: Date };
  groupBy: 'day' | 'week' | 'month';
}

export const ConsumptionTrendChart: React.FC<ConsumptionTrendChartProps> = ({
  consumptionData,
  dateRange,
  groupBy
}) => {
  // Group data by date
  const groupedData = React.useMemo(() => {
    if (!consumptionData.length) return {};

    // Create date intervals based on groupBy
    let intervals: Date[];
    if (groupBy === 'day') {
      intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    } else if (groupBy === 'week') {
      intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to });
    } else {
      intervals = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    }

    // Initialize data structure
    const result: Record<string, number> = {};
    intervals.forEach(date => {
      let key;
      if (groupBy === 'day') {
        key = format(date, 'yyyy-MM-dd');
      } else if (groupBy === 'week') {
        key = `Week ${format(date, 'w')}`;
      } else {
        key = format(date, 'yyyy-MM');
      }
      result[key] = 0;
    });

    // Aggregate consumption data
    consumptionData.forEach(record => {
      const date = parseISO(record.timestamp);
      let key;
      if (groupBy === 'day') {
        key = format(date, 'yyyy-MM-dd');
      } else if (groupBy === 'week') {
        key = `Week ${format(date, 'w')}`;
      } else {
        key = format(date, 'yyyy-MM');
      }

      if (result[key] !== undefined) {
        result[key] += Number(record.amount);
      }
    });

    return result;
  }, [consumptionData, dateRange, groupBy]);

  const chartData: ChartData<'line'> = {
    labels: Object.keys(groupedData).map(key => {
      if (groupBy === 'day') return format(parseISO(key), 'MMM dd');
      if (groupBy === 'week') return key; // Already formatted as "Week X"
      return format(parseISO(`${key}-01`), 'MMM yyyy');
    }),
    datasets: [
      {
        label: 'Total Consumption',
        data: Object.values(groupedData),
        borderColor: 'hsl(223, 61%, 31%)', // primary color
        backgroundColor: 'hsla(223, 61%, 31%, 0.5)', // primary color with opacity
        tension: 0.3,
      },
    ],
  };

  return <Line options={commonOptions} data={chartData} />;
};

// Consumption By Category Chart
interface ConsumptionByCategoryChartProps {
  consumptionData: any[];
}

export const ConsumptionByCategoryChart: React.FC<ConsumptionByCategoryChartProps> = ({
  consumptionData
}) => {
  // Group data by category
  const groupedData = React.useMemo(() => {
    if (!consumptionData.length) return {};

    return consumptionData.reduce((acc: Record<string, number>, record) => {
      const category = record.inventory_items?.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(record.amount);
      return acc;
    }, {});
  }, [consumptionData]);

  const categories = Object.keys(groupedData);
  const { colors, backgroundColors } = generateColors(categories.length);

  const chartData: ChartData<'doughnut'> = {
    labels: categories,
    datasets: [
      {
        data: Object.values(groupedData),
        backgroundColor: backgroundColors,
        borderColor: colors,
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: 'Consumption by Category',
      },
    },
  };

  return <Doughnut options={options} data={chartData} />;
};

// Stock Level Distribution Chart
interface StockLevelChartProps {
  inventoryItems: any[];
}

export const StockLevelChart: React.FC<StockLevelChartProps> = ({
  inventoryItems
}) => {
  // Count items by status
  const statusCounts = React.useMemo(() => {
    const counts = {
      normal: 0,
      low: 0,
      critical: 0,
    };

    inventoryItems.forEach(item => {
      const status = item.status || 'normal';
      if (counts[status as keyof typeof counts] !== undefined) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [inventoryItems]);

  const chartData: ChartData<'pie'> = {
    labels: ['Normal', 'Low', 'Critical'],
    datasets: [
      {
        data: [statusCounts.normal, statusCounts.low, statusCounts.critical],
        backgroundColor: [
          'hsla(193, 61%, 31%, 0.7)', // chart-2 for normal
          'hsla(193, 61%, 34%, 0.7)', // chart-4 for low
          'hsla(20, 80%, 32%, 0.7)',  // destructive for critical
        ],
        borderColor: [
          'hsl(193, 61%, 31%)', // chart-2 for normal
          'hsl(193, 61%, 34%)', // chart-4 for low
          'hsl(20, 80%, 32%)',  // destructive for critical
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: 'Stock Level Distribution',
      },
    },
  };

  return <Pie options={options} data={chartData} />;
};

// Category Distribution Chart
interface CategoryDistributionChartProps {
  inventoryItems: any[];
}

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  inventoryItems
}) => {
  // Group items by category
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};

    inventoryItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });

    return categories;
  }, [inventoryItems]);

  const categories = Object.keys(categoryData);
  const { colors, backgroundColors } = generateColors(categories.length);

  const chartData: ChartData<'bar'> = {
    labels: categories,
    datasets: [
      {
        label: 'Number of Items',
        data: Object.values(categoryData),
        backgroundColor: backgroundColors,
        borderColor: colors,
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: 'Items by Category',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return <Bar options={options} data={chartData} />;
};

// Location Distribution Chart
interface LocationDistributionChartProps {
  inventoryItems: any[];
}

export const LocationDistributionChart: React.FC<LocationDistributionChartProps> = ({
  inventoryItems
}) => {
  // Group items by location
  const locationData = React.useMemo(() => {
    const locations: Record<string, number> = {};

    inventoryItems.forEach(item => {
      const location = item.locations?.name || 'Unknown Location';
      if (!locations[location]) {
        locations[location] = 0;
      }
      locations[location]++;
    });

    return locations;
  }, [inventoryItems]);

  const locations = Object.keys(locationData);
  const { colors, backgroundColors } = generateColors(locations.length);

  const chartData: ChartData<'pie'> = {
    labels: locations,
    datasets: [
      {
        data: Object.values(locationData),
        backgroundColor: backgroundColors,
        borderColor: colors,
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: 'Items by Location',
      },
    },
  };

  return <Pie options={options} data={chartData} />;
};
