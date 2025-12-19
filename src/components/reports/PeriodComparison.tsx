'use client';

interface ComparisonMetric {
  label: string;
  current: number;
  previous: number;
  format: 'currency' | 'number' | 'decimal';
}

interface PeriodComparisonProps {
  comparisonMode: 'week' | 'month' | 'year' | 'custom';
  metrics: ComparisonMetric[];
  currency?: string;
}

export default function PeriodComparison({ comparisonMode, metrics, currency = 'AUD' }: PeriodComparisonProps) {
  const formatValue = (value: number, format: 'currency' | 'number' | 'decimal') => {
    switch (format) {
      case 'currency':
        if (currency === 'AUD') {
          return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(value);
        }
        // Fallback for other currencies
        return `${currency} ${value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      case 'decimal':
        return value.toFixed(2);
      case 'number':
      default:
        return value.toLocaleString('en-US');
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getComparisonLabel = () => {
    switch (comparisonMode) {
      case 'week':
        return 'vs Last Week';
      case 'month':
        return 'vs Last Month';
      case 'year':
        return 'vs Last Year';
      case 'custom':
        return 'vs Previous Period';
      default:
        return '';
    }
  };

  const getTrendIcon = (growth: number) => {
    if (growth > 0) return (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    );
    if (growth < 0) return (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
    return (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  const getTrendColor = (growth: number) => {
    if (growth > 0) return 'text-success-600 dark:text-success-400';
    if (growth < 0) return 'text-error-600 dark:text-error-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Period Comparison
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{getComparisonLabel()}</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const growth = calculateGrowth(metric.current, metric.previous);
          const isPositive = growth > 0;
          const isNegative = growth < 0;

          return (
            <div
              key={index}
              className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/50 dark:bg-white/[0.02]"
            >
              {/* Label */}
              <div className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                {metric.label}
              </div>

              {/* Current Value */}
              <div className="mb-2 text-lg font-bold text-gray-900 dark:text-white/90">
                {formatValue(metric.current, metric.format)}
              </div>

              {/* Comparison */}
              <div className="flex items-center justify-between">
                {/* Previous Value */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatValue(metric.previous, metric.format)}
                </div>

                {/* Growth Percentage */}
                <div className={`flex items-center gap-1 text-xs font-semibold ${getTrendColor(growth)}`}>
                  {getTrendIcon(growth)}
                  <span>{Math.abs(growth).toFixed(1)}%</span>
                </div>
              </div>

              {/* Growth Bar */}
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className={`h-full transition-all ${
                    isPositive
                      ? 'bg-success-500'
                      : isNegative
                        ? 'bg-error-500'
                        : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(Math.abs(growth), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
