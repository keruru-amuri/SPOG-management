/**
 * Constants for report types and components
 * These serialized names make it easier to reference specific report components
 * during development, testing, and troubleshooting.
 */

export const REPORT_TYPES = {
  // Main report types
  EXECUTIVE: 'executive',
  CONSUMPTION: 'consumption',
  FORECASTING: 'forecasting',
  ANOMALY: 'anomaly',
  INVENTORY: 'inventory',
  CATEGORY: 'category',
  LOCATION: 'location',
} as const;

export type ReportType = typeof REPORT_TYPES[keyof typeof REPORT_TYPES];

// Component identifiers
export const REPORT_COMPONENTS = {
  // Executive Dashboard components
  EXEC_SUMMARY: 'EXEC-01',
  EXEC_INVENTORY_OVERVIEW: 'EXEC-02',
  EXEC_CONSUMPTION_TREND: 'EXEC-03',
  EXEC_CRITICAL_ITEMS: 'EXEC-04',
  
  // Inventory Health components
  INV_HEALTH_SUMMARY: 'INV-01',
  INV_HEALTH_CRITICAL: 'INV-02',
  INV_HEALTH_LOW: 'INV-03',
  INV_HEALTH_NORMAL: 'INV-04',
  
  // Consumption Trends components
  CONS_TREND_CHART: 'CONS-01',
  CONS_TREND_METRICS: 'CONS-02',
  CONS_TREND_ITEM_SELECTOR: 'CONS-03',
  
  // Consumption Forecasting components
  FORECAST_CHART: 'FORE-01',
  FORECAST_METRICS: 'FORE-02',
  FORECAST_RECOMMENDATIONS: 'FORE-03',
  
  // Category Analysis components
  CAT_SUMMARY: 'CAT-01',
  CAT_CHART: 'CAT-02',
  CAT_TABLE: 'CAT-03',
  CAT_TOP_ITEMS: 'CAT-04',
  
  // Anomaly Detection components
  ANOM_SUMMARY: 'ANOM-01',
  ANOM_TOP_ITEMS: 'ANOM-02',
  ANOM_LIST: 'ANOM-03',
  
  // Location Analysis components
  LOC_SUMMARY: 'LOC-01',
  LOC_CHART: 'LOC-02',
  LOC_TABLE: 'LOC-03',
} as const;

export type ReportComponent = typeof REPORT_COMPONENTS[keyof typeof REPORT_COMPONENTS];

/**
 * Maps report types to their component identifiers
 * This helps identify which components belong to which report type
 */
export const REPORT_TYPE_COMPONENTS: Record<ReportType, ReportComponent[]> = {
  [REPORT_TYPES.EXECUTIVE]: [
    REPORT_COMPONENTS.EXEC_SUMMARY,
    REPORT_COMPONENTS.EXEC_INVENTORY_OVERVIEW,
    REPORT_COMPONENTS.EXEC_CONSUMPTION_TREND,
    REPORT_COMPONENTS.EXEC_CRITICAL_ITEMS,
  ],
  [REPORT_TYPES.INVENTORY]: [
    REPORT_COMPONENTS.INV_HEALTH_SUMMARY,
    REPORT_COMPONENTS.INV_HEALTH_CRITICAL,
    REPORT_COMPONENTS.INV_HEALTH_LOW,
    REPORT_COMPONENTS.INV_HEALTH_NORMAL,
  ],
  [REPORT_TYPES.CONSUMPTION]: [
    REPORT_COMPONENTS.CONS_TREND_CHART,
    REPORT_COMPONENTS.CONS_TREND_METRICS,
    REPORT_COMPONENTS.CONS_TREND_ITEM_SELECTOR,
  ],
  [REPORT_TYPES.FORECASTING]: [
    REPORT_COMPONENTS.FORECAST_CHART,
    REPORT_COMPONENTS.FORECAST_METRICS,
    REPORT_COMPONENTS.FORECAST_RECOMMENDATIONS,
  ],
  [REPORT_TYPES.CATEGORY]: [
    REPORT_COMPONENTS.CAT_SUMMARY,
    REPORT_COMPONENTS.CAT_CHART,
    REPORT_COMPONENTS.CAT_TABLE,
    REPORT_COMPONENTS.CAT_TOP_ITEMS,
  ],
  [REPORT_TYPES.ANOMALY]: [
    REPORT_COMPONENTS.ANOM_SUMMARY,
    REPORT_COMPONENTS.ANOM_TOP_ITEMS,
    REPORT_COMPONENTS.ANOM_LIST,
  ],
  [REPORT_TYPES.LOCATION]: [
    REPORT_COMPONENTS.LOC_SUMMARY,
    REPORT_COMPONENTS.LOC_CHART,
    REPORT_COMPONENTS.LOC_TABLE,
  ],
};

/**
 * Get a human-readable name for a report component
 * @param componentId The serialized component identifier
 * @returns A human-readable name for the component
 */
export function getComponentName(componentId: ReportComponent): string {
  const componentNames: Record<ReportComponent, string> = {
    // Executive Dashboard
    [REPORT_COMPONENTS.EXEC_SUMMARY]: 'Executive Summary',
    [REPORT_COMPONENTS.EXEC_INVENTORY_OVERVIEW]: 'Inventory Overview',
    [REPORT_COMPONENTS.EXEC_CONSUMPTION_TREND]: 'Consumption Trend',
    [REPORT_COMPONENTS.EXEC_CRITICAL_ITEMS]: 'Critical Items',
    
    // Inventory Health
    [REPORT_COMPONENTS.INV_HEALTH_SUMMARY]: 'Inventory Health Summary',
    [REPORT_COMPONENTS.INV_HEALTH_CRITICAL]: 'Critical Items',
    [REPORT_COMPONENTS.INV_HEALTH_LOW]: 'Low Stock Items',
    [REPORT_COMPONENTS.INV_HEALTH_NORMAL]: 'Normal Stock Items',
    
    // Consumption Trends
    [REPORT_COMPONENTS.CONS_TREND_CHART]: 'Consumption Trend Chart',
    [REPORT_COMPONENTS.CONS_TREND_METRICS]: 'Consumption Metrics',
    [REPORT_COMPONENTS.CONS_TREND_ITEM_SELECTOR]: 'Item Selector',
    
    // Consumption Forecasting
    [REPORT_COMPONENTS.FORECAST_CHART]: 'Forecast Chart',
    [REPORT_COMPONENTS.FORECAST_METRICS]: 'Forecast Metrics',
    [REPORT_COMPONENTS.FORECAST_RECOMMENDATIONS]: 'Recommendations',
    
    // Category Analysis
    [REPORT_COMPONENTS.CAT_SUMMARY]: 'Category Summary',
    [REPORT_COMPONENTS.CAT_CHART]: 'Category Chart',
    [REPORT_COMPONENTS.CAT_TABLE]: 'Category Table',
    [REPORT_COMPONENTS.CAT_TOP_ITEMS]: 'Top Items by Category',
    
    // Anomaly Detection
    [REPORT_COMPONENTS.ANOM_SUMMARY]: 'Anomaly Summary',
    [REPORT_COMPONENTS.ANOM_TOP_ITEMS]: 'Items with Most Anomalies',
    [REPORT_COMPONENTS.ANOM_LIST]: 'Anomaly List',
    
    // Location Analysis
    [REPORT_COMPONENTS.LOC_SUMMARY]: 'Location Summary',
    [REPORT_COMPONENTS.LOC_CHART]: 'Location Chart',
    [REPORT_COMPONENTS.LOC_TABLE]: 'Location Table',
  };
  
  return componentNames[componentId] || componentId;
}

/**
 * Get a human-readable name for a report type
 * @param reportType The serialized report type
 * @returns A human-readable name for the report type
 */
export function getReportTypeName(reportType: ReportType): string {
  const reportTypeNames: Record<ReportType, string> = {
    [REPORT_TYPES.EXECUTIVE]: 'Executive Dashboard',
    [REPORT_TYPES.INVENTORY]: 'Inventory Health Analysis',
    [REPORT_TYPES.CONSUMPTION]: 'Consumption Trends',
    [REPORT_TYPES.FORECASTING]: 'Consumption Forecasting',
    [REPORT_TYPES.CATEGORY]: 'Category Analysis',
    [REPORT_TYPES.ANOMALY]: 'Anomaly Detection',
    [REPORT_TYPES.LOCATION]: 'Location Analysis',
  };
  
  return reportTypeNames[reportType] || reportType;
}
