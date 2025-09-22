# 📊 px64 Charts: Complete Implementation Examples

*Copy-paste chart implementations for Cursor AI*

## 🎯 Sparklines (Mini Charts)

### **Basic Line Sparkline**
```html
<div data-bind="sparkline:salesData" data-color="#007bff"></div>
```
```javascript
const data = px64.observable({
    salesData: [100, 120, 110, 140, 160, 180, 200]
});
```

### **Area Sparkline (Filled)**
```html
<div data-bind="sparkline:revenueData"
     data-type="area"
     data-color="#28a745"
     data-height="50"></div>
```

### **Bar Sparkline**
```html
<div data-bind="sparkline:conversionData"
     data-type="bar"
     data-color="#ffc107"></div>
```

### **Win/Loss Sparkline**
```html
<div data-bind="sparkline:profitLossData"
     data-type="winloss"
     data-win-color="#28a745"
     data-loss-color="#dc3545"></div>
```
```javascript
const data = px64.observable({
    profitLossData: [1, -1, 1, 1, -1, 1, -1, 1] // 1 = win, -1 = loss
});
```

---

## 📈 Full Charts

### **Line Chart**
```html
<div style="height: 300px;">
    <div data-bind="chart:monthlyData"
         data-type="line"
         data-color="#007bff"></div>
</div>
```
```javascript
const data = px64.observable({
    monthlyData: [120, 140, 130, 160, 180, 200, 220, 210, 240]
});
```

### **Bar Chart**
```html
<div style="height: 250px;">
    <div data-bind="chart:categoryData"
         data-type="bar"
         data-color="#28a745"></div>
</div>
```
```javascript
const data = px64.observable({
    categoryData: [45, 32, 28, 19, 15, 12, 8]
});
```

### **Area Chart**
```html
<div style="height: 300px;">
    <div data-bind="chart:trafficData"
         data-type="area"
         data-color="#17a2b8"></div>
</div>
```
```javascript
const data = px64.observable({
    trafficData: [1200, 1400, 1300, 1600, 1800, 2000, 2200]
});
```

### **Pie Chart**
```html
<div style="height: 300px;">
    <div data-bind="chart:sourceData"
         data-type="pie"></div>
</div>
```
```javascript
const data = px64.observable({
    sourceData: [45, 25, 15, 10, 5] // Direct, Social, Search, Email, Other
});
```

---

## 🔗 Grouped Charts (Synchronized Scaling)

### **Conversion Funnel**
```html
<div class="row">
    <div class="col-md-4">
        <h6>Views: <span data-bind="text:views"></span></h6>
        <div data-bind="sparkline:viewsData"
             data-group="funnel"
             data-color="#007bff"></div>
    </div>
    <div class="col-md-4">
        <h6>Clicks: <span data-bind="text:clicks"></span></h6>
        <div data-bind="sparkline:clicksData"
             data-group="funnel"
             data-color="#28a745"></div>
    </div>
    <div class="col-md-4">
        <h6>Conversions: <span data-bind="text:conversions"></span></h6>
        <div data-bind="sparkline:conversionsData"
             data-group="funnel"
             data-color="#ffc107"></div>
    </div>
</div>
```
```javascript
const data = px64.observable({
    views: 4500,
    clicks: 320,
    conversions: 15,
    viewsData: [4000, 4200, 3800, 4500, 4100],
    clicksData: [280, 300, 270, 320, 290],
    conversionsData: [12, 14, 11, 15, 13]
});
```

---

## 📊 Micro Bars (Analytics Style)

### **Traffic Sources**
```html
<div class="card">
    <div class="card-body">
        <h6>Traffic Sources</h6>

        <div class="d-flex align-items-center mb-2">
            <span class="me-3" style="width: 80px;">Direct</span>
            <div data-bind="microbar:directTraffic"
                 data-color="#007bff"
                 style="flex: 1; height: 20px;"></div>
            <span class="ms-3 text-muted" data-bind="text:directFormatted"></span>
        </div>

        <div class="d-flex align-items-center mb-2">
            <span class="me-3" style="width: 80px;">Social</span>
            <div data-bind="microbar:socialTraffic"
                 data-color="#28a745"
                 style="flex: 1; height: 20px;"></div>
            <span class="ms-3 text-muted" data-bind="text:socialFormatted"></span>
        </div>

        <div class="d-flex align-items-center mb-2">
            <span class="me-3" style="width: 80px;">Search</span>
            <div data-bind="microbar:searchTraffic"
                 data-color="#ffc107"
                 style="flex: 1; height: 20px;"></div>
            <span class="ms-3 text-muted" data-bind="text:searchFormatted"></span>
        </div>
    </div>
</div>
```
```javascript
const data = px64.observable({
    directTraffic: 2340,
    socialTraffic: 1890,
    searchTraffic: 1240,

    // Computed formatted values
    get directFormatted() { return this.formatValue(this.directTraffic); },
    get socialFormatted() { return this.formatValue(this.socialTraffic); },
    get searchFormatted() { return this.formatValue(this.searchTraffic); },

    formatValue(value) {
        if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
        return value.toString();
    }
});
```

---

## 🎨 Theming Examples

### **Bootstrap Theme (Default)**
```html
<div data-bind="sparkline:data" data-theme="bootstrap"></div>
```

### **Material Theme**
```html
<div data-bind="sparkline:data" data-theme="material"></div>
```

### **Pastel Theme**
```html
<div data-bind="sparkline:data" data-theme="pastel"></div>
```

### **Dark Theme**
```html
<div data-bind="sparkline:data" data-theme="dark"></div>
```

### **Custom Colors**
```html
<div data-bind="sparkline:data" data-color="#ff6b6b"></div>
<div data-bind="chart:data" data-color="#4ecdc4"></div>
```

---

## 🔄 Real-time Updates

### **Streaming Data**
```html
<div class="card">
    <div class="card-header">
        <h5>Live Data</h5>
        <button data-bind="tap:toggleStream" class="btn btn-sm btn-primary">
            <span data-bind="text:streamStatus"></span>
        </button>
    </div>
    <div class="card-body">
        <div style="height: 200px;">
            <div data-bind="sparkline:liveData"
                 data-type="area"
                 data-color="#17a2b8"></div>
        </div>
    </div>
</div>
```
```javascript
const data = px64.observable({
    liveData: [10, 12, 8, 15, 11, 9, 14],
    streaming: false,
    streamInterval: null,

    get streamStatus() {
        return this.streaming ? 'Stop' : 'Start';
    },

    toggleStream() {
        if (this.streaming) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
            this.$set('streaming', false);
        } else {
            this.streamInterval = setInterval(() => {
                const newValue = Math.random() * 20 + 5;
                this.liveData.$push(Math.round(newValue));

                // Keep last 20 points
                if (this.liveData.length > 20) {
                    this.liveData.$shift();
                }
            }, 1000);
            this.$set('streaming', true);
        }
    }
});
```

---

## 📱 Responsive Charts

### **Mobile-Friendly KPI Cards**
```html
<div class="row">
    <div class="col-6 col-md-3 mb-3">
        <div class="card text-center">
            <div class="card-body p-3">
                <h6 class="text-muted mb-1">Sales</h6>
                <div class="h4 mb-2" data-bind="text:totalSales"></div>
                <div data-bind="sparkline:salesData"
                     data-color="#007bff"
                     data-height="30"></div>
            </div>
        </div>
    </div>
    <!-- Repeat for other metrics -->
</div>
```

### **Responsive Chart Container**
```html
<div class="card">
    <div class="card-body">
        <div class="chart-responsive" style="height: 250px;">
            <div data-bind="chart:data" data-type="line"></div>
        </div>
    </div>
</div>

<style>
@media (max-width: 768px) {
    .chart-responsive {
        height: 200px !important;
    }
}
</style>
```

---

## 🎯 Dashboard Layouts

### **3-Column KPI Layout**
```html
<div class="row">
    <div class="col-lg-4 mb-4">
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="text-muted">Revenue</h6>
                        <h2 class="mb-0" data-bind="text:revenue"></h2>
                        <small class="text-success">
                            <i class="fas fa-arrow-up"></i> 12.5%
                        </small>
                    </div>
                    <div style="width: 80px; height: 40px;">
                        <div data-bind="sparkline:revenueData"
                             data-type="area"
                             data-color="#28a745"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Repeat for other KPIs -->
</div>
```

### **Split Chart Layout**
```html
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5>Trends</h5>
            </div>
            <div class="card-body">
                <div style="height: 300px;">
                    <div data-bind="chart:trendsData" data-type="line"></div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h5>Distribution</h5>
            </div>
            <div class="card-body">
                <div style="height: 300px;">
                    <div data-bind="chart:distributionData" data-type="pie"></div>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

## 🚨 Important Notes

### **Always Set Container Height**
```html
<!-- ✅ Correct -->
<div style="height: 300px;">
    <div data-bind="chart:data"></div>
</div>

<!-- ❌ Wrong - No height -->
<div data-bind="chart:data"></div>
```

### **Use Observable Data**
```javascript
// ✅ Correct
const data = px64.observable({ sales: [1,2,3] });

// ❌ Wrong - Not observable
const data = { sales: [1,2,3] };
```

### **Update Data Properly**
```javascript
// ✅ Correct - Triggers chart animation
data.sales.$push(newValue);
data.$set('sales', newArray);

// ❌ Wrong - No animation
data.sales.push(newValue);
data.sales = newArray;
```

---

---

## 📋 Data Tables

### **Auto-Generated Table with Sorting**
```html
<table data-bind="table:employees"
       data-meta="cols:name,email,role,salary,created;sort:name"
       class="table table-striped">
    <!-- px64 automatically generates headers and rows -->
</table>
```
```javascript
const data = px64.observable({
    employees: px64.listState([
        {
            name: 'John Doe',
            email: 'john@company.com',
            role: 'Developer',
            salary: 75000,
            created: new Date('2023-01-15')
        },
        {
            name: 'Jane Smith',
            email: 'jane@company.com',
            role: 'Designer',
            salary: 68000,
            created: new Date('2023-03-20')
        }
    ])
});
```

### **Table with Actions**
```html
<div class="card">
    <div class="card-header d-flex justify-content-between">
        <h5>Employee Directory</h5>
        <button data-bind="tap:addEmployee" class="btn btn-primary">Add</button>
    </div>
    <div class="card-body">
        <table data-bind="table:employees"
               data-meta="cols:name,email,role,salary,status;sort:name"
               class="table">
        </table>
    </div>
</div>
```
```javascript
const data = px64.observable({
    employees: px64.listState([]),

    addEmployee() {
        const newEmployee = {
            name: 'New Employee',
            email: 'new@company.com',
            role: 'Developer',
            salary: 70000,
            status: 'active'
        };

        const current = this.employees.items.slice();
        current.push(newEmployee);
        this.employees.setItems(current);
    }
});
```

### **Table Features:**
- ✅ **Auto-generated headers** from `cols:` metadata
- ✅ **Click headers to sort** (automatic)
- ✅ **Reactive updates** when data changes
- ✅ **Works with listState** for pagination/filtering
- ✅ **Supports any object properties**

---

**These examples cover all chart types and patterns. Copy-paste and modify for your specific use case!** 📊
