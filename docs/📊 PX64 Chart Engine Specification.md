# 📊 PX64 Chart Engine Specification
*Lightweight, Reactive Canvas-Based Charting Extension for px64*

## 🎯 **Project Vision**

Create an **ultra-lightweight chart extension** (`px64-charts.js` <10KB) that seamlessly extends px64 with reactive canvas-based charting capabilities. No external dependencies, pure Canvas API, with smooth animations and real-time data updates.
---

## 🏧 **Architecture Overview**

### **Separate File Strategy**
```
px64.js (core library - no charts)
├── Core binders (text, html, show, hide, etc.)
├── Form binders (value, checkbox, radio, etc.)
├── Bootstrap auto-wiring
└── Reactive system

px64-charts.js (separate chart extension <10KB)
├── Lightweight canvas chart engine
├── Chart binders (sparkline:, chart:, minichart:)
├── Chart renderers (Line, Bar, Area, Pie)
└── Auto-registers with px64 on load
```

### **Integration Pattern**
```html
<!-- Core px64 (required) -->
<script src="px64.js"></script>

<!-- Charts extension (optional) -->
<script src="px64-charts.js"></script>

<!-- Charts work immediately with px64 patterns -->
<div data-bind="sparkline:salesData" data-color="#28a745"></div>
```

---

## 📊 **Core Technical Principles**

### **1. Lightweight Extension**
- **Target: <10KB minified** (vs Chart.js 200KB+)
- Pure Canvas API, no external dependencies
- Auto-registers chart binders with px64
- Modular design - only essential chart types

### **2. Native px64 Integration**
- **Seamless binder registration** - `px64.addBinder('sparkline', ...)`
- **Auto-updates** when observable data changes
- **Smooth animations** on data transitions
- **Real-time streaming** support via observables

### **3. Performance Optimized**
- **60fps animations** using requestAnimationFrame
- **Canvas pooling** and reuse
- **Smart diffing** - only redraw changed elements
- **Memory efficient** - automatic cleanup

### **4. Developer Experience**
- **Declarative HTML** markup
- **Bootstrap color themes** built-in
- **Responsive by default**
- **Zero configuration** - works out of the box
---

## ⚡ **Chart Types Priority**

### **Phase 1 (MVP - Core Engine)**
1. **Sparklines** - Line, Area, Bar, Win/Loss
2. **Line Charts** - Single/multi-series with smooth curves
3. **Bar Charts** - Vertical, horizontal, grouped, stacked

### **Phase 2 (Essential Charts)**
4. **Area Charts** - Filled regions
5. **Pie/Doughnut Charts** - Part-to-whole relationships

### **Future Addons (Separate Modules)**
- **Scatter Plots** - Correlation data
- **Bullet Charts** - Performance vs targets
- **Gauge Charts** - Single values with context
- **Heatmaps** - Matrix visualization
- **Candlestick Charts** - Financial data
- **Radar Charts** - Multi-dimensional data
---

## 🎨 **Enhanced Binder API Design**

### **Sparkline Binder**
```html
<!-- Basic sparklines -->
<div data-bind="sparkline:salesData"></div>
<div data-bind="sparkline:userGrowth" data-color="#28a745"></div>

<!-- Styled sparklines with grouping -->
<div data-bind="sparkline:revenueData"
     data-type="area"
     data-fill="true"
     data-height="40"
     data-group="kpi-cards"
     data-scale-sync="true"></div>

<!-- Win/Loss sparklines -->
<div data-bind="sparkline:winLossData"
     data-type="winloss"
     data-win-color="#28a745"
     data-loss-color="#dc3545"></div>
```

### **Chart Binder**
```html
<!-- Responsive chart with parent sizing -->
<div style="height: 300px;" class="chart-container">
    <div data-bind="chart:salesData"
         data-type="line"
         data-responsive="true"
         data-animate="true"></div>
</div>

<!-- Grouped charts with synchronized scaling -->
<div data-bind="chart:viewsData"
     data-type="bar"
     data-group="conversion-funnel"
     data-scale-sync="true"
     data-scale-mode="max"></div>

<div data-bind="chart:clicksData"
     data-type="bar"
     data-group="conversion-funnel"
     data-scale-sync="true"
     data-scale-mode="max"></div>

<!-- Multi-series charts -->
<div data-bind="chart:comparisonData"
     data-type="line"
     data-legend="true"
     data-smooth="0.4"
     data-colors="bootstrap"></div>
```

### **Mini Chart Binder**
```html
<!-- Dashboard card mini-charts -->
<div data-bind="minichart:cpuUsage"
     data-type="area"
     data-color="#007bff"
     data-height="60"></div>
```

### **New Data Attributes**
- `data-responsive="true"` - Auto-resize on window resize (default: true)
- `data-maintain-aspect="false"` - Allow stretching to fill parent
- `data-group="group-name"` - Assign chart to scaling group
- `data-scale-sync="true"` - Participate in group scaling
- `data-scale-mode="max|relative|fixed"` - Group scaling behavior
- `data-resize-debounce="300"` - Resize delay in milliseconds
---

## 🔧 **Advanced Sizing & Scaling Features**

### **1. Parent Container Sizing**
```html
<!-- Charts automatically fill parent container -->
<div style="width: 400px; height: 200px;">
    <div data-bind="chart:salesData" data-type="line"></div>
</div>

<!-- Responsive containers -->
<div class="col-md-6" style="height: 300px;">
    <div data-bind="sparkline:userGrowth"></div>
</div>
```

**Implementation:**
- Charts automatically detect parent dimensions
- Canvas sized to 100% width/height of parent
- High-DPI support with proper pixel ratio scaling
- No chart overflow - always contained within parent

### **2. Auto-Resize on Window Resize**
```javascript
// Automatic window resize handling
window.addEventListener('resize', () => {
    px64Charts.resizeAll(); // Resize all charts
});

// Individual chart resize
px64Charts.resize('chart-id'); // Resize specific chart
```

**Features:**
- Debounced resize events (300ms delay)
- Smooth resize animations
- Maintain aspect ratios where needed
- Recalculate scales and redraw

### **3. Group Scaling System**
```html
<!-- Grouped charts with synchronized scaling -->
<div data-chart-group="metrics" data-scale-mode="max">
    <div class="row">
        <div class="col-md-4">
            <h6>Views (4.2K)</h6>
            <div data-bind="chart:viewsData" data-type="bar" data-group="metrics"></div>
        </div>
        <div class="col-md-4">
            <h6>Clicks (120)</h6>
            <div data-bind="chart:clicksData" data-type="bar" data-group="metrics"></div>
        </div>
        <div class="col-md-4">
            <h6>Conversions (8)</h6>
            <div data-bind="chart:conversionData" data-type="bar" data-group="metrics"></div>
        </div>
    </div>
</div>
```

**Scaling Modes:**
- `data-scale-mode="max"` - Scale all charts to highest value in group
- `data-scale-mode="relative"` - Proportional scaling based on data ranges
- `data-scale-mode="fixed"` - Fixed scale across all charts
- `data-scale-mode="individual"` - Each chart scales independently (default)

**Group Examples:**
```javascript
// Example data that benefits from group scaling
const dashboardData = px64.observable({
    viewsData: [4000, 4200, 3800, 4500, 4100],      // Scale: 0-5000
    clicksData: [100, 120, 95, 135, 110],           // Scale: 0-5000 (grouped)
    conversionsData: [5, 8, 4, 9, 6]                // Scale: 0-5000 (grouped)
});

// All charts will use 0-4500 scale (max value across group)
// Makes visual comparison meaningful and proportional
```
---

## 🔄 **Reactive Integration**

### **Automatic Updates**
```javascript
const dashboardData = px64.observable({
    sales: [100, 120, 110, 140, 160, 180, 200],
    users: [50, 65, 70, 85, 90, 95, 110]
});

// Charts automatically animate to new values
dashboardData.$set('sales', [100, 120, 110, 140, 160, 190, 220]);
```

### **Real-time Streaming**
```javascript
// Append new data points with smooth animations
dashboardData.sales.$push(250);  // New point slides in
dashboardData.sales.$shift();    // Oldest point fades out

// Real-time updates trigger smooth transitions
setInterval(() => {
    dashboardData.sales.$push(Math.random() * 100 + 150);
    if (dashboardData.sales.length > 20) {
        dashboardData.sales.$shift();
    }
}, 1000);
```

### **Animation Triggers**
- **Data change** - Smooth transition to new values
- **Data append** - Slide in new points
- **Data remove** - Fade out removed points
- **Complete refresh** - Staggered rebuild animation

---

## 🎨 **Built-in Theme System**

### **Color Palettes**
```javascript
themes: {
    bootstrap: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
    material: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0'],
    pastel: ['#A8E6CF', '#FFD3A5', '#FD8A8A', '#A8D8EA', '#C7CEEA'],
    dark: ['#495057', '#6c757d', '#adb5bd', '#ced4da', '#dee2e6']
}
```

### **Responsive Breakpoints**
- **xs**: <576px - Minimal labels, compact layout
- **sm**: 576px+ - Standard features
- **md**: 768px+ - Full feature set
- **lg**: 992px+ - Enhanced spacing
- **xl**: 1200px+ - Maximum detail

---

## 📱 **Performance & Responsive Features**

### **Optimization Features**
- **Canvas pooling** - Reuse canvas elements
- **Viewport culling** - Don't render off-screen elements
- **Level of detail** - Simpler rendering at small sizes
- **Memory cleanup** - Automatic cleanup on chart destruction
- **Smart diffing** - Only redraw changed elements

### **Responsive Design**
- **Container-aware sizing** - Fills parent element
- **Breakpoint adaptation** - Adjust features by screen size
- **Touch-friendly interactions** - Mobile-optimized
- **Accessibility** - ARIA labels and screen reader support
---

## 🛠 **Implementation Strategy**

### **Week 1: Core Engine & Sparklines**
- [ ] Canvas management system **with parent container sizing**
- [ ] **Auto-resize system with window event handling**
- [ ] Animation framework with easing functions
- [ ] **Group scaling system for synchronized charts**
- [ ] Data processing utilities
- [ ] px64 binder auto-registration
- [ ] Sparkline renderer (line, area, bar, win/loss)

### **Week 2: Essential Charts**
- [ ] Line chart with multi-series support
- [ ] Bar chart with grouping/stacking
- [ ] Basic color theming system
- [ ] **Responsive breakpoints and scaling modes**

### **Week 3: Polish & Performance**
- [ ] Area charts and pie/doughnut charts
- [ ] Performance optimizations
- [ ] Error handling & validation
- [ ] Memory management & cleanup

### **Week 4: Production Ready**
- [ ] Interactive features (hover, tooltips)
- [ ] Export capabilities (PNG/SVG)
- [ ] Documentation & examples
- [ ] Testing & browser compatibility

### **Future Phases (Addon Modules)**
- [ ] Advanced chart types (scatter, bullet, gauge, heatmap)
- [ ] 3D visualizations
- [ ] Real-time streaming optimizations
- [ ] WebGL acceleration for large datasets
---

## 🔌 **Auto-Registration Pattern**

### **px64-charts.js Structure**
```javascript
(function() {
    'use strict';

    // Ensure px64 is loaded
    if (typeof px64 === 'undefined') {
        console.error('px64-charts requires px64.js to be loaded first');
        return;
    }

    // Chart engine core with sizing and scaling
    class PX64Charts {
        constructor() {
            this.charts = new Map();
            this.groups = new Map();
            this.setupResizeHandler();
        }

        setupResizeHandler() {
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.resizeAll();
                }, 300);
            });
        }

        // Group scaling management
        addToGroup(chartId, groupName, data) {
            if (!this.groups.has(groupName)) {
                this.groups.set(groupName, []);
            }
            this.groups.get(groupName).push({ chartId, data });
            this.updateGroupScale(groupName);
        }
    }

    // Auto-register binders with px64
    px64.addBinder('sparkline', sparklineBinder);
    px64.addBinder('chart', chartBinder);
    px64.addBinder('minichart', minichartBinder);

    console.log('📊 px64-charts loaded - chart binders registered');

    // Expose chart engine globally
    window.px64Charts = new PX64Charts();
})();
```

---

## 💡 **Key Benefits vs Chart.js**

1. **20x Smaller** - <10KB vs 200KB+
2. **Native px64** - Seamless integration, feels like core feature
3. **Reactive First** - Built specifically for observable data
4. **Performance** - 60fps animations, minimal memory usage
5. **Declarative** - HTML markup, no configuration objects
6. **Optional** - Core px64 stays lightweight
7. **Commercial Ready** - Production-grade reliability
8. **Group Scaling** - Synchronized chart scaling for dashboards
9. **Auto-Responsive** - Perfect parent container fitting

---

## 🎯 **Success Metrics**

### **Performance Targets**
- **Bundle Size**: <10KB minified (px64-charts.js)
- **Render Time**: <16ms per frame (60fps target)
- **Memory Usage**: <5MB for 100+ charts
- **Load Time**: <100ms initialization
- **Resize Performance**: <50ms for full dashboard resize

### **Developer Experience**
- **Setup Time**: <5 minutes to first chart
- **Learning Curve**: Familiar to px64 users
- **Integration**: Zero configuration required
- **Documentation**: Complete API reference with examples

---

## ✅ **Implementation Checklist**

### **Core Requirements**
- [ ] Separate file architecture (px64-charts.js)
- [ ] Auto-registration with px64 binders
- [ ] Canvas-based rendering engine
- [ ] Reactive data integration
- [ ] Smooth animations with easing
- [ ] **Parent container sizing detection**
- [ ] **Auto-resize on window resize**
- [ ] **Group scaling system**
- [ ] Sparklines (line, area, bar, win/loss)
- [ ] Line and bar charts
- [ ] Bootstrap color themes
- [ ] Responsive design
- [ ] Memory management

### **Quality Gates**
- [ ] <10KB minified bundle size
- [ ] 60fps animation performance
- [ ] Zero memory leaks
- [ ] Cross-browser compatibility
- [ ] Touch-friendly mobile support
- [ ] Accessibility compliance
- [ ] Production documentation
- [ ] **Perfect parent container fitting**
- [ ] **Smooth resize performance**

---

**This lightweight chart extension will provide everything needed for modern dashboards while maintaining px64's philosophy of simplicity, performance, and reactive data binding!** 🚀

The separate file approach keeps the core px64 library focused and allows charts to be completely optional, while providing seamless integration with advanced features like group scaling and responsive sizing when needed.
