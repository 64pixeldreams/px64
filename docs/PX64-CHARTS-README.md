# 📊 PX64 Charts Extension
*Lightweight, Reactive Canvas-Based Charting for px64*

## 🚀 **Quick Start**

### **Installation**
```html
<!-- Core px64 (required) -->
<script src="px64.js"></script>

<!-- Charts extension (optional) -->
<script src="px64-charts.js"></script>

<!-- Charts work immediately -->
<div data-bind="sparkline:salesData" data-color="#28a745"></div>
```

### **Basic Example**
```html
<!DOCTYPE html>
<html>
<head>
    <title>PX64 Charts Demo</title>
</head>
<body>
    <!-- Sparkline -->
    <div style="height: 40px; width: 200px;">
        <div data-bind="sparkline:trendData" data-color="#007bff"></div>
    </div>

    <!-- Full chart -->
    <div style="height: 300px;">
        <div data-bind="chart:salesData" data-type="line"></div>
    </div>

    <script src="px64.js"></script>
    <script src="px64-charts.js"></script>
    <script>
        const data = px64.observable({
            trendData: [10, 15, 12, 18, 22, 25, 20, 28, 30, 26],
            salesData: [100, 120, 110, 140, 160, 180, 200, 190, 210, 220]
        });

        px64.bind('body', data);

        // Charts automatically update when data changes
        setInterval(() => {
            data.trendData.$push(Math.random() * 40 + 10);
            if (data.trendData.length > 20) {
                data.trendData.$shift();
            }
        }, 1000);
    </script>
</body>
</html>
```

---

## 📊 **Chart Types**

### **1. Sparklines** - `data-bind="sparkline:data"`

Tiny charts perfect for dashboards and KPI cards.

#### **Line Sparklines**
```html
<div data-bind="sparkline:salesTrend" data-color="#28a745"></div>
<div data-bind="sparkline:userGrowth" data-color="#007bff" data-height="60"></div>
```

#### **Area Sparklines**
```html
<div data-bind="sparkline:revenueData"
     data-type="area"
     data-color="#17a2b8"></div>
```

#### **Bar Sparklines**
```html
<div data-bind="sparkline:dailyOrders"
     data-type="bar"
     data-color="#ffc107"></div>
```

#### **Win/Loss Sparklines**
```html
<div data-bind="sparkline:winLossRecord"
     data-type="winloss"
     data-win-color="#28a745"
     data-loss-color="#dc3545"></div>
```

### **2. Full Charts** - `data-bind="chart:data"`

Complete charts with axes and labels.

#### **Line Charts**
```html
<div style="height: 300px;">
    <div data-bind="chart:timeSeriesData"
         data-type="line"
         data-color="#007bff"></div>
</div>
```

#### **Bar Charts**
```html
<div style="height: 300px;">
    <div data-bind="chart:categoryData"
         data-type="bar"
         data-color="#28a745"></div>
</div>
```

#### **Area Charts**
```html
<div style="height: 300px;">
    <div data-bind="chart:cumulativeData"
         data-type="area"
         data-color="#17a2b8"></div>
</div>
```

#### **Pie Charts**
```html
<div style="height: 300px;">
    <div data-bind="chart:marketShare"
         data-type="pie"
         data-theme="bootstrap"></div>
</div>
```

### **3. Micro Bars** - `data-bind="microbar:value"`

Analytics-style horizontal bars perfect for traffic, usage, and comparison data.

```html
<!-- Clean layout with separate text and bars -->
<div style="display: flex; align-items: center; gap: 12px; height: 24px;">
    <div style="width: 80px;">HTML</div>
    <div style="width: 60px; text-align: right;" data-bind="text:htmlTrafficFormatted"></div>
    <div style="width: 150px; height: 16px;">
        <div data-bind="microbar:htmlTraffic" data-color="#007bff" data-group="traffic"></div>
    </div>
</div>
```

---

## 🎨 **Theming & Colors**

### **Built-in Color Themes**
```html
<!-- Bootstrap theme -->
<div data-bind="chart:data" data-theme="bootstrap" data-type="pie"></div>

<!-- Material theme -->
<div data-bind="sparkline:data" data-theme="material" data-color="#2196F3"></div>

<!-- Pastel theme -->
<div data-bind="chart:data" data-theme="pastel" data-type="bar"></div>

<!-- Dark theme -->
<div data-bind="sparkline:data" data-theme="dark" data-color="#495057"></div>
```

### **Custom Colors**
```html
<!-- Single color -->
<div data-bind="sparkline:data" data-color="#ff6b6b"></div>

<!-- Win/Loss custom colors -->
<div data-bind="sparkline:winLoss"
     data-type="winloss"
     data-win-color="#00d4aa"
     data-loss-color="#ff5722"></div>
```

### **Available Color Palettes**
- **Bootstrap**: `#007bff`, `#28a745`, `#ffc107`, `#dc3545`, `#17a2b8`, `#6f42c1`
- **Material**: `#2196F3`, `#4CAF50`, `#FF9800`, `#F44336`, `#9C27B0`, `#00BCD4`
- **Pastel**: `#A8E6CF`, `#FFD3A5`, `#FD8A8A`, `#A8D8EA`, `#C7CEEA`, `#F8D7DA`
- **Dark**: `#495057`, `#6c757d`, `#adb5bd`, `#ced4da`, `#dee2e6`, `#f8f9fa`

---

## 🔄 **Reactive Data Integration**

### **Observable Data**
```javascript
const dashboardData = px64.observable({
    sales: [100, 120, 110, 140, 160, 180, 200],
    users: [50, 65, 70, 85, 90, 95, 110],
    revenue: 45000
});

// Charts automatically animate when data changes
dashboardData.$set('sales', [100, 120, 110, 140, 160, 190, 220]);
dashboardData.$set('revenue', 52000);
```

### **Real-time Streaming**
```javascript
// Add new data points with smooth animations
dashboardData.sales.$push(250);  // New point slides in
dashboardData.sales.$shift();    // Oldest point fades out

// Real-time updates
setInterval(() => {
    dashboardData.sales.$push(Math.random() * 100 + 150);
    if (dashboardData.sales.length > 20) {
        dashboardData.sales.$shift();
    }
}, 1000);
```

---

## 📏 **Sizing & Responsive Design**

### **Container-Based Sizing**
Charts automatically fill their parent container:

```html
<!-- Fixed size -->
<div style="width: 400px; height: 200px;">
    <div data-bind="chart:data" data-type="line"></div>
</div>

<!-- Responsive grid -->
<div class="col-md-6" style="height: 300px;">
    <div data-bind="sparkline:data"></div>
</div>

<!-- Card layout -->
<div class="card-body" style="height: 150px;">
    <div data-bind="chart:data" data-type="area"></div>
</div>
```

### **Height Control**
```html
<!-- Custom sparkline height -->
<div data-bind="sparkline:data" data-height="80"></div>

<!-- Custom chart height -->
<div data-bind="chart:data" data-height="400"></div>
```

---

## 🔗 **Group Scaling**

Perfect for dashboard comparisons where you need to see relative magnitudes.

### **Conversion Funnel Example**
```html
<!-- All charts scale to the largest value (views) -->
<div data-bind="sparkline:viewsData" data-group="funnel" data-color="#007bff"></div>
<div data-bind="sparkline:clicksData" data-group="funnel" data-color="#28a745"></div>
<div data-bind="sparkline:conversionsData" data-group="funnel" data-color="#dc3545"></div>
```

```javascript
const funnelData = px64.observable({
    viewsData: [4000, 4200, 3800, 4500, 4100],     // Large values
    clicksData: [120, 135, 105, 150, 140],         // Medium values
    conversionsData: [8, 12, 7, 15, 11]            // Small values
});

// All charts will scale to 0-4500 range
// Views dominate visually (correct)
// Clicks are small lines (correct - 3% of views)
// Conversions are tiny lines (correct - 0.3% of views)
```

### **Analytics Dashboard Example**
```html
<!-- Traffic data with clean layout -->
<div style="display: flex; align-items: center; gap: 12px;">
    <div style="width: 80px;">HTML</div>
    <div style="width: 60px; text-align: right;" data-bind="text:htmlFormatted"></div>
    <div style="width: 150px; height: 16px;">
        <div data-bind="microbar:htmlTraffic" data-color="#007bff" data-group="traffic"></div>
    </div>
</div>
```

---

## 🎛️ **Data Attributes**

### **Common Attributes**
- `data-color="#007bff"` - Custom color
- `data-height="60"` - Custom height in pixels
- `data-group="group-name"` - Group for synchronized scaling
- `data-theme="bootstrap"` - Use color theme

### **Sparkline Specific**
- `data-type="line|area|bar|winloss"` - Sparkline type
- `data-win-color="#28a745"` - Win color (winloss type)
- `data-loss-color="#dc3545"` - Loss color (winloss type)

### **Chart Specific**
- `data-type="line|bar|area|pie"` - Chart type

### **Microbar Specific**
- `data-max="1000"` - Manual max value (if not using groups)

---

## 🎯 **Use Cases**

### **Dashboard KPI Cards**
```html
<div class="card">
    <div class="card-body">
        <h5>Daily Sales</h5>
        <h2 data-bind="text:todaySales">$12,450</h2>
        <div style="height: 40px; margin-top: 10px;">
            <div data-bind="sparkline:salesTrend" data-type="area" data-color="#28a745"></div>
        </div>
    </div>
</div>
```

### **Analytics Tables**
```html
<table class="table">
    <tr>
        <td>Page Views</td>
        <td data-bind="text:pageViewsFormatted">1.2M</td>
        <td style="width: 150px;">
            <div data-bind="microbar:pageViews" data-group="metrics"></div>
        </td>
    </tr>
    <tr>
        <td>Unique Visitors</td>
        <td data-bind="text:visitorsFormatted">245K</td>
        <td style="width: 150px;">
            <div data-bind="microbar:visitors" data-group="metrics"></div>
        </td>
    </tr>
</table>
```

### **Performance Monitoring**
```html
<div class="row">
    <div class="col-md-4">
        <h6>CPU Usage</h6>
        <div style="height: 60px;">
            <div data-bind="sparkline:cpuData" data-type="area" data-color="#dc3545"></div>
        </div>
    </div>
    <div class="col-md-4">
        <h6>Memory Usage</h6>
        <div style="height: 60px;">
            <div data-bind="sparkline:memoryData" data-type="area" data-color="#ffc107"></div>
        </div>
    </div>
    <div class="col-md-4">
        <h6>Network I/O</h6>
        <div style="height: 60px;">
            <div data-bind="sparkline:networkData" data-type="line" data-color="#17a2b8"></div>
        </div>
    </div>
</div>
```

---

## ⚡ **Performance Features**

### **Lightweight**
- **~15KB minified** (vs Chart.js 200KB+)
- **Zero dependencies** - Pure Canvas API
- **Fast initialization** - <100ms startup

### **Smooth Animations**
- **60fps animations** using requestAnimationFrame
- **300ms transitions** with ease-out easing
- **Automatic interpolation** between old and new data
- **Animation cancellation** prevents overlapping updates

### **Memory Efficient**
- **Canvas pooling** - Reuse canvas elements
- **Automatic cleanup** - Remove event listeners on destroy
- **Smart diffing** - Only redraw when data changes
- **Group management** - Efficient scaling calculations

### **Responsive Design**
- **Auto-resize** - Window resize handling with 300ms debouncing
- **Container-aware** - Automatically fits parent dimensions
- **High-DPI support** - Perfect rendering on retina displays
- **Touch-friendly** - Works on mobile devices

---

## 🎨 **Advanced Examples**

### **Real-time Dashboard**
```html
<div class="dashboard">
    <!-- KPI Cards with sparklines -->
    <div class="row">
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h6>Revenue</h6>
                    <h3 data-bind="text:revenueFormatted">$45.2K</h3>
                    <div style="height: 40px; margin-top: 10px;">
                        <div data-bind="sparkline:revenueData"
                             data-type="area"
                             data-color="#28a745"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h6>Users</h6>
                    <h3 data-bind="text:usersFormatted">2.1K</h3>
                    <div style="height: 40px; margin-top: 10px;">
                        <div data-bind="sparkline:usersData"
                             data-type="line"
                             data-color="#007bff"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main chart -->
    <div class="row mt-4">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h5>Sales Trend</h5>
                </div>
                <div class="card-body" style="height: 400px;">
                    <div data-bind="chart:salesHistory"
                         data-type="line"
                         data-color="#007bff"></div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### **Analytics Table**
```html
<table class="table">
    <thead>
        <tr>
            <th>Content Type</th>
            <th>Requests</th>
            <th>Visual</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>HTML</td>
            <td data-bind="text:htmlTrafficFormatted">768.6K</td>
            <td style="width: 150px;">
                <div data-bind="microbar:htmlTraffic"
                     data-color="#007bff"
                     data-group="content-types"></div>
            </td>
        </tr>
        <tr>
            <td>CSS</td>
            <td data-bind="text:cssTrafficFormatted">126.8K</td>
            <td style="width: 150px;">
                <div data-bind="microbar:cssTraffic"
                     data-color="#28a745"
                     data-group="content-types"></div>
            </td>
        </tr>
        <tr>
            <td>JavaScript</td>
            <td data-bind="text:jsTrafficFormatted">89.3K</td>
            <td style="width: 150px;">
                <div data-bind="microbar:jsTraffic"
                     data-color="#ffc107"
                     data-group="content-types"></div>
            </td>
        </tr>
    </tbody>
</table>
```

### **Conversion Funnel**
```html
<div class="funnel-analysis">
    <h4>Conversion Funnel</h4>

    <!-- Grouped sparklines show proportional relationship -->
    <div class="funnel-step">
        <span>Page Views</span>
        <span data-bind="text:viewsFormatted">4.5K</span>
        <div style="width: 200px; height: 30px;">
            <div data-bind="sparkline:viewsData"
                 data-group="funnel"
                 data-color="#007bff"></div>
        </div>
    </div>

    <div class="funnel-step">
        <span>Clicks</span>
        <span data-bind="text:clicksFormatted">150</span>
        <div style="width: 200px; height: 30px;">
            <div data-bind="sparkline:clicksData"
                 data-group="funnel"
                 data-color="#28a745"></div>
        </div>
    </div>

    <div class="funnel-step">
        <span>Conversions</span>
        <span data-bind="text:conversionsFormatted">15</span>
        <div style="width: 200px; height: 30px;">
            <div data-bind="sparkline:conversionsData"
                 data-group="funnel"
                 data-color="#dc3545"></div>
        </div>
    </div>
</div>
```

---

## 🔧 **API Reference**

### **Available Binders**

| Binder | Purpose | Data Type | Example |
|--------|---------|-----------|---------|
| `sparkline:` | Tiny trend charts | Array of numbers | `[10, 15, 12, 18, 22]` |
| `chart:` | Full charts with axes | Array of numbers | `[100, 120, 110, 140]` |
| `microbar:` | Horizontal progress bars | Single number | `768650` |

### **Data Attributes**

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-type` | `line`, `area`, `bar`, `winloss`, `pie` | `line` | Chart/sparkline type |
| `data-color` | Hex color | `#007bff` | Primary color |
| `data-height` | Number (px) | `40` (sparkline), `200` (chart) | Height override |
| `data-group` | String | `null` | Group name for scaling |
| `data-theme` | `bootstrap`, `material`, `pastel`, `dark` | `null` | Color theme |
| `data-max` | Number | Auto-calculated | Manual max value |
| `data-win-color` | Hex color | `#28a745` | Win color (winloss) |
| `data-loss-color` | Hex color | `#dc3545` | Loss color (winloss) |

---

## 💡 **Best Practices**

### **Container Sizing**
```html
<!-- ✅ Good: Set parent container size -->
<div style="height: 300px;">
    <div data-bind="chart:data"></div>
</div>

<!-- ❌ Bad: No height specified -->
<div data-bind="chart:data"></div>
```

### **Data Format**
```javascript
// ✅ Good: Clean numeric arrays
const data = px64.observable({
    sales: [100, 120, 110, 140, 160],
    revenue: 45000
});

// ❌ Bad: Mixed data types
const data = {
    sales: ["100", "120", null, "140"]
};
```

### **Group Scaling**
```html
<!-- ✅ Good: Use groups for meaningful comparisons -->
<div data-bind="sparkline:views" data-group="funnel"></div>
<div data-bind="sparkline:clicks" data-group="funnel"></div>
<div data-bind="sparkline:conversions" data-group="funnel"></div>

<!-- ❌ Bad: Individual scaling misleads -->
<div data-bind="sparkline:views"></div>
<div data-bind="sparkline:clicks"></div>
<div data-bind="sparkline:conversions"></div>
```

---

## 🚀 **Getting Started**

1. **Include Scripts**
   ```html
   <script src="px64.js"></script>
   <script src="px64-charts.js"></script>
   ```

2. **Create Observable Data**
   ```javascript
   const data = px64.observable({
       sales: [10, 15, 12, 18, 22, 25, 20, 28, 30, 26]
   });
   ```

3. **Add Chart Markup**
   ```html
   <div style="height: 40px;">
       <div data-bind="sparkline:sales" data-color="#28a745"></div>
   </div>
   ```

4. **Bind to Page**
   ```javascript
   px64.bind('body', data);
   ```

5. **Update Data** (charts animate automatically)
   ```javascript
   data.$set('sales', [15, 20, 18, 25, 30, 35, 28, 40, 45, 38]);
   ```

---

## 📋 **Browser Support**

- **Modern browsers** with Canvas API support
- **Chrome 60+**, **Firefox 55+**, **Safari 12+**, **Edge 79+**
- **Mobile browsers** - iOS Safari, Chrome Mobile
- **High-DPI displays** - Automatic retina support

---

## 🎯 **File Size**

- **px64-charts.js**: ~15KB minified
- **Total with px64.js**: ~25KB (vs Chart.js 200KB+)
- **Gzipped**: ~8KB total

---

**Ready to build beautiful, reactive dashboards with px64-charts!** 🚀

For more examples, see `sparkline-test.html` in the project repository.
