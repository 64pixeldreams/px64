# 🎯 px64 Charts: Common Patterns & Recipes

*Ready-to-use code snippets for Cursor AI*

## 📊 Dashboard Patterns

### **Pattern 1: KPI Card with Sparkline**
```html
<div class="card">
    <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <h6 class="text-muted mb-1">{{METRIC_NAME}}</h6>
                <div class="h3 mb-0 text-{{COLOR}}" data-bind="text:{{VALUE_KEY}}"></div>
                <small class="text-{{TREND_COLOR}}">
                    <i class="fas fa-arrow-{{TREND_DIRECTION}}"></i>
                    <span data-bind="text:{{CHANGE_KEY}}"></span>%
                </small>
            </div>
            <div style="width: 80px; height: 40px;">
                <div data-bind="sparkline:{{DATA_KEY}}"
                     data-type="{{TYPE}}"
                     data-color="{{COLOR_HEX}}"></div>
            </div>
        </div>
    </div>
</div>
```

### **Pattern 2: Chart Card with Actions**
```html
<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">{{CHART_TITLE}}</h5>
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-sm btn-outline-secondary"
                    data-bind="tap:{{ACTION_1}}">{{LABEL_1}}</button>
            <button type="button" class="btn btn-sm btn-outline-secondary"
                    data-bind="tap:{{ACTION_2}}">{{LABEL_2}}</button>
        </div>
    </div>
    <div class="card-body">
        <div style="height: {{HEIGHT}}px;">
            <div data-bind="chart:{{DATA_KEY}}"
                 data-type="{{CHART_TYPE}}"
                 data-color="{{COLOR}}"></div>
        </div>
    </div>
</div>
```

### **Pattern 3: Metric Grid**
```html
<div class="row">
    {{#each metrics}}
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="card border-left-{{color}}">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs font-weight-bold text-{{color}} text-uppercase mb-1">
                            {{title}}
                        </div>
                        <div class="h5 mb-0 font-weight-bold text-gray-800"
                             data-bind="text:{{valueKey}}"></div>
                    </div>
                    <div class="col-auto">
                        <div style="width: 60px; height: 30px;">
                            <div data-bind="sparkline:{{dataKey}}"
                                 data-color="{{colorHex}}"
                                 data-height="30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    {{/each}}
</div>
```

---

## 🔄 Data Update Patterns

### **Pattern 1: Real-time Streaming**
```javascript
// Setup streaming data
const streamingData = px64.observable({
    liveMetrics: [10, 12, 8, 15, 11, 9, 14],
    isStreaming: false,
    streamInterval: null,
    maxDataPoints: 20,

    startStreaming() {
        if (this.isStreaming) return;

        this.streamInterval = setInterval(() => {
            const newValue = this.generateDataPoint();
            this.liveMetrics.$push(newValue);

            // Keep only last N points
            if (this.liveMetrics.length > this.maxDataPoints) {
                this.liveMetrics.$shift();
            }
        }, 2000);

        this.$set('isStreaming', true);
    },

    stopStreaming() {
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }
        this.$set('isStreaming', false);
    },

    generateDataPoint() {
        // Your data generation logic
        return Math.round(Math.random() * 50 + 25);
    }
});
```

### **Pattern 2: Periodic Updates**
```javascript
// Setup periodic data refresh
const dashboardData = px64.observable({
    metrics: {
        sales: 0,
        users: 0,
        revenue: 0
    },

    async refreshData() {
        try {
            const response = await fetch('/api/dashboard-metrics');
            const newData = await response.json();

            // Update observable data
            this.$set('metrics', newData);

        } catch (error) {
            console.error('Failed to refresh data:', error);
        }
    }
});

// Auto-refresh every 30 seconds
setInterval(() => {
    dashboardData.refreshData();
}, 30000);
```

### **Pattern 3: User-Triggered Updates**
```javascript
const analyticsData = px64.observable({
    dateRange: '7d',
    chartData: [],
    loading: false,

    async updateDateRange(range) {
        this.$set('dateRange', range);
        this.$set('loading', true);

        try {
            const data = await this.fetchData(range);
            this.$set('chartData', data);
        } finally {
            this.$set('loading', false);
        }
    },

    async fetchData(range) {
        const response = await fetch(`/api/analytics?range=${range}`);
        return await response.json();
    }
});
```

---

## 🎨 Styling Patterns

### **Pattern 1: Color-Coded Metrics**
```javascript
const colorPatterns = {
    // Status-based colors
    getStatusColor(value, thresholds) {
        if (value >= thresholds.good) return '#28a745';
        if (value >= thresholds.warning) return '#ffc107';
        return '#dc3545';
    },

    // Trend-based colors
    getTrendColor(current, previous) {
        if (current > previous) return '#28a745';
        if (current < previous) return '#dc3545';
        return '#6c757d';
    },

    // Category colors
    categoryColors: {
        sales: '#007bff',
        marketing: '#28a745',
        support: '#ffc107',
        development: '#17a2b8'
    }
};
```

### **Pattern 2: Responsive Chart Heights**
```css
.chart-container {
    height: 300px;
}

@media (max-width: 768px) {
    .chart-container {
        height: 200px;
    }
}

@media (max-width: 576px) {
    .chart-container {
        height: 150px;
    }
}
```

### **Pattern 3: Theme Switching**
```javascript
const themeManager = px64.observable({
    currentTheme: 'bootstrap',
    themes: ['bootstrap', 'material', 'pastel', 'dark'],

    switchTheme(newTheme) {
        this.$set('currentTheme', newTheme);
        // Update all charts with new theme
        document.querySelectorAll('[data-bind*="sparkline:"], [data-bind*="chart:"]')
            .forEach(el => el.setAttribute('data-theme', newTheme));
    }
});
```

---

## 📱 Mobile Patterns

### **Pattern 1: Mobile KPI Cards**
```html
<div class="row">
    <div class="col-6 mb-3">
        <div class="card text-center">
            <div class="card-body p-2">
                <small class="text-muted">{{METRIC}}</small>
                <div class="h5 mb-1" data-bind="text:{{VALUE}}"></div>
                <div data-bind="sparkline:{{DATA}}"
                     data-height="25"
                     data-color="{{COLOR}}"></div>
            </div>
        </div>
    </div>
</div>
```

### **Pattern 2: Collapsible Charts**
```html
<div class="card">
    <div class="card-header" data-bs-toggle="collapse" data-bs-target="#chart-{{ID}}">
        <h6 class="mb-0">
            {{TITLE}}
            <i class="fas fa-chevron-down float-end"></i>
        </h6>
    </div>
    <div id="chart-{{ID}}" class="collapse show">
        <div class="card-body">
            <div style="height: 200px;">
                <div data-bind="chart:{{DATA}}" data-type="{{TYPE}}"></div>
            </div>
        </div>
    </div>
</div>
```

---

## 🔧 Utility Patterns

### **Pattern 1: Data Formatters**
```javascript
const formatters = {
    // Number formatting
    formatNumber(value) {
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
        return value.toString();
    },

    // Percentage formatting
    formatPercent(value) {
        return value.toFixed(1) + '%';
    },

    // Currency formatting
    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    },

    // Date formatting
    formatDate(date) {
        return new Date(date).toLocaleDateString();
    }
};
```

### **Pattern 2: Data Validation**
```javascript
const validators = {
    // Validate chart data
    validateChartData(data) {
        if (!Array.isArray(data)) return false;
        if (data.length === 0) return false;
        return data.every(item => typeof item === 'number' && !isNaN(item));
    },

    // Clean data
    cleanChartData(data) {
        return data.filter(item => typeof item === 'number' && !isNaN(item));
    },

    // Fill missing data
    fillMissingData(data, defaultValue = 0) {
        return data.map(item => item == null ? defaultValue : item);
    }
};
```

### **Pattern 3: Chart Configuration**
```javascript
const chartConfigs = {
    // Default sparkline config
    sparklineDefaults: {
        height: 40,
        type: 'line',
        theme: 'bootstrap'
    },

    // KPI card sparkline
    kpiSparkline: {
        height: 30,
        type: 'area',
        color: '#007bff'
    },

    // Dashboard main chart
    mainChart: {
        height: 300,
        type: 'line',
        responsive: true,
        animate: true
    },

    // Mobile chart
    mobileChart: {
        height: 200,
        type: 'line',
        responsive: true
    }
};
```

---

## 🎯 Complete Component Patterns

### **Pattern 1: Analytics Widget**
```html
<div class="analytics-widget">
    <div class="widget-header">
        <h6>{{WIDGET_TITLE}}</h6>
        <div class="widget-controls">
            <select data-bind="value:timeRange" class="form-select form-select-sm">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
            </select>
        </div>
    </div>
    <div class="widget-content">
        <div class="metric-value">
            <span data-bind="text:currentValue" class="value"></span>
            <span data-bind="text:changePercent" class="change"></span>
        </div>
        <div class="metric-chart">
            <div data-bind="sparkline:chartData"
                 data-type="area"
                 data-color="{{COLOR}}"
                 data-height="60"></div>
        </div>
    </div>
</div>
```

### **Pattern 2: Comparison Chart**
```html
<div class="comparison-chart">
    <div class="chart-header">
        <h6>{{TITLE}}</h6>
        <div class="legend">
            <span class="legend-item">
                <span class="legend-color" style="background: #007bff;"></span>
                {{SERIES_1}}
            </span>
            <span class="legend-item">
                <span class="legend-color" style="background: #28a745;"></span>
                {{SERIES_2}}
            </span>
        </div>
    </div>
    <div class="chart-body">
        <div style="height: 250px;">
            <div data-bind="chart:comparisonData"
                 data-type="line"
                 data-multi-series="true"></div>
        </div>
    </div>
</div>
```

---

## 🚨 Error Handling Patterns

### **Pattern 1: Graceful Degradation**
```javascript
const robustData = px64.observable({
    chartData: [],
    hasError: false,
    errorMessage: '',

    async loadData() {
        try {
            this.$set('hasError', false);
            const data = await this.fetchChartData();

            // Validate data
            if (!validators.validateChartData(data)) {
                throw new Error('Invalid chart data received');
            }

            this.$set('chartData', data);

        } catch (error) {
            console.error('Chart data error:', error);
            this.$set('hasError', true);
            this.$set('errorMessage', error.message);
            this.$set('chartData', []); // Fallback empty data
        }
    }
});
```

### **Pattern 2: Loading States**
```html
<div class="chart-container">
    <div data-bind="show:loading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 text-muted">Loading chart data...</p>
    </div>

    <div data-bind="show:hasError" class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <span data-bind="text:errorMessage"></span>
    </div>

    <div data-bind="show:!loading && !hasError" style="height: 300px;">
        <div data-bind="chart:chartData" data-type="line"></div>
    </div>
</div>
```

---

**These patterns cover 90% of dashboard and chart use cases. Mix and match as needed!** 🎯
