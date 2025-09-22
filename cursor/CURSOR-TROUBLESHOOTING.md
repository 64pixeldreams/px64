# 🚨 px64 Charts: Troubleshooting Guide for Cursor

*Quick fixes for common issues when implementing px64 + charts*

## 🔧 Setup Issues

### **Problem: Charts not rendering**
```
Error: px64-charts requires px64.js to be loaded first
```
**Solution:**
```html
<!-- ✅ Correct order -->
<script src="px64.js"></script>
<script src="px64-charts.js"></script>

<!-- ❌ Wrong order -->
<script src="px64-charts.js"></script>
<script src="px64.js"></script>
```

### **Problem: Charts appear as empty divs**
**Symptoms:** Div exists but no chart visible

**Causes & Solutions:**
```html
<!-- ❌ Missing height -->
<div data-bind="sparkline:data"></div>

<!-- ✅ Set container height -->
<div style="height: 40px;">
    <div data-bind="sparkline:data"></div>
</div>

<!-- OR for full charts -->
<div style="height: 300px;">
    <div data-bind="chart:data"></div>
</div>
```

### **Problem: Data not observable**
```javascript
// ❌ Wrong - not observable
const data = { sales: [1,2,3] };
px64.bind('#chart', data);

// ✅ Correct - observable
const data = px64.observable({ sales: [1,2,3] });
px64.bind('#chart', data);
```

---

## 📊 Chart-Specific Issues

### **Problem: Sparklines not updating**
**Symptoms:** Chart shows initial data but doesn't animate on updates

**Solution:**
```javascript
// ❌ Wrong - direct array manipulation
data.sales.push(newValue);

// ✅ Correct - observable methods
data.sales.$push(newValue);
data.$set('sales', newArray);
```

### **Problem: Charts too small on mobile**
**Solution:**
```css
/* Responsive chart heights */
.chart-container {
    height: 300px;
}

@media (max-width: 768px) {
    .chart-container {
        height: 200px;
    }
}
```

### **Problem: Pie chart shows empty**
**Cause:** Pie charts need positive numbers
```javascript
// ❌ Wrong - negative or zero values
const data = px64.observable({
    pieData: [0, -5, 10, 0]
});

// ✅ Correct - positive values only
const data = px64.observable({
    pieData: [25, 35, 20, 20]
});
```

### **Problem: Group scaling not working**
**Solution:** Ensure all charts have same group name
```html
<!-- ✅ Correct - same group -->
<div data-bind="sparkline:views" data-group="funnel"></div>
<div data-bind="sparkline:clicks" data-group="funnel"></div>
<div data-bind="sparkline:conversions" data-group="funnel"></div>

<!-- ❌ Wrong - different/missing groups -->
<div data-bind="sparkline:views" data-group="funnel"></div>
<div data-bind="sparkline:clicks" data-group="metrics"></div>
<div data-bind="sparkline:conversions"></div>
```

---

## 🔄 Data Issues

### **Problem: Charts show NaN or undefined**
**Cause:** Invalid data in array
**Solution:**
```javascript
// Data validation helper
function cleanChartData(data) {
    return data.filter(item =>
        typeof item === 'number' &&
        !isNaN(item) &&
        isFinite(item)
    );
}

// Usage
const cleanData = cleanChartData(rawData);
chartData.$set('sales', cleanData);
```

### **Problem: Real-time updates too fast**
**Cause:** Updates happening too frequently
**Solution:**
```javascript
// ❌ Too frequent
setInterval(() => {
    data.sales.$push(newValue);
}, 100); // Every 100ms - too fast!

// ✅ Reasonable frequency
setInterval(() => {
    data.sales.$push(newValue);
}, 2000); // Every 2 seconds
```

### **Problem: Memory issues with streaming data**
**Solution:** Limit data points
```javascript
const streamingData = px64.observable({
    liveData: [],
    maxPoints: 50,

    addDataPoint(value) {
        this.liveData.$push(value);

        // Remove old points
        if (this.liveData.length > this.maxPoints) {
            this.liveData.$shift();
        }
    }
});
```

---

## 🎨 Styling Issues

### **Problem: Charts look pixelated**
**Cause:** High-DPI display scaling issue
**Solution:** Charts auto-handle DPI, but ensure proper container sizing
```css
.chart-container {
    width: 100%;
    height: 300px;
    /* Don't set fixed pixel dimensions on canvas */
}
```

### **Problem: Colors not applying**
**Check attribute syntax:**
```html
<!-- ✅ Correct -->
<div data-bind="sparkline:data" data-color="#007bff"></div>

<!-- ❌ Wrong - missing # -->
<div data-bind="sparkline:data" data-color="007bff"></div>

<!-- ❌ Wrong - invalid color -->
<div data-bind="sparkline:data" data-color="blue"></div>
```

### **Problem: Charts overflow container**
**Solution:**
```css
.chart-wrapper {
    overflow: hidden;
    border-radius: 0.375rem;
}

.chart-wrapper canvas {
    max-width: 100%;
    height: auto;
}
```

---

## ⚡ Performance Issues

### **Problem: Slow chart rendering**
**Causes & Solutions:**

1. **Too many data points:**
```javascript
// ❌ Too many points
const data = Array.from({length: 10000}, (_, i) => Math.random());

// ✅ Reasonable amount
const data = Array.from({length: 100}, (_, i) => Math.random());
```

2. **Too many charts:**
```html
<!-- ❌ Too many individual charts -->
<div data-bind="sparkline:data1"></div>
<div data-bind="sparkline:data2"></div>
<!-- ... 100 more charts ... -->

<!-- ✅ Use grouped charts or pagination -->
<div data-bind="chart:combinedData" data-type="line"></div>
```

3. **Frequent updates:**
```javascript
// ❌ Update every chart individually
charts.forEach(chart => chart.update());

// ✅ Batch updates
requestAnimationFrame(() => {
    charts.forEach(chart => chart.update());
});
```

---

## 🔧 Integration Issues

### **Problem: Bootstrap conflicts**
**Symptoms:** Layout breaks with Bootstrap
**Solution:**
```html
<!-- Ensure Bootstrap CSS loads first -->
<link href="bootstrap.min.css" rel="stylesheet">
<script src="px64.js"></script>
<script src="px64-charts.js"></script>

<!-- Don't load Bootstrap JS if using px64 auto-wiring -->
<!-- <script src="bootstrap.bundle.min.js"></script> -->
```

### **Problem: Charts not responsive**
**Solution:**
```javascript
// Enable auto-resize (default: true)
<div data-bind="chart:data" data-responsive="true"></div>

// Or manually trigger resize
window.addEventListener('resize', () => {
    px64Charts.resizeAll();
});
```

### **Problem: Multiple px64 instances**
**Symptoms:** Bindings not working correctly
**Solution:**
```javascript
// ✅ One bind per container
px64.bind('#dashboard', dashboardData);

// ❌ Multiple binds on same element
px64.bind('#dashboard', data1);
px64.bind('#dashboard', data2); // Overwrites first
```

---

## 🚨 Console Errors

### **Error: `Cannot read properties of undefined`**
```
TypeError: Cannot read properties of undefined (reading '$push')
```
**Cause:** Trying to update non-observable data
**Solution:**
```javascript
// ✅ Ensure data is observable
const data = px64.observable({
    sales: [1,2,3]
});

// ✅ Check before updating
if (data.sales && data.sales.$push) {
    data.sales.$push(newValue);
}
```

### **Error: `Chart data is not iterable`**
**Cause:** Data is not an array
**Solution:**
```javascript
// ✅ Ensure array data
const data = px64.observable({
    chartData: Array.isArray(rawData) ? rawData : []
});
```

### **Error: `Canvas getContext is null`**
**Cause:** Canvas element not properly created
**Solution:**
```javascript
// Check if element exists before binding
const element = document.querySelector('#chart');
if (element) {
    px64.bind('#chart', data);
}
```

---

## 🔍 Debugging Tips

### **1. Check Console Logs**
```javascript
// px64-charts logs useful info
console.log('📊 px64-charts loaded - chart binders registered');
```

### **2. Inspect Data**
```javascript
// Debug data in browser console
console.log('Chart data:', data.chartData);
console.log('Is observable:', data.$set ? 'Yes' : 'No');
```

### **3. Verify DOM Binding**
```javascript
// Check if element is bound
const element = document.querySelector('#chart');
console.log('Has data-scope-id:', element.hasAttribute('data-scope-id'));
```

### **4. Test with Simple Data**
```javascript
// Start with simple test data
const testData = px64.observable({
    simple: [1, 2, 3, 4, 5]
});
```

---

## 📋 Checklist for New Implementation

### **Before You Start:**
- [ ] px64.js loaded before px64-charts.js
- [ ] Container elements have proper height
- [ ] Data is wrapped in px64.observable()
- [ ] Chart type is valid (line, area, bar, pie, winloss)

### **During Development:**
- [ ] Test with simple data first
- [ ] Check browser console for errors
- [ ] Verify responsive behavior
- [ ] Test data updates and animations

### **Before Production:**
- [ ] Validate all chart data
- [ ] Test on mobile devices
- [ ] Check performance with real data volumes
- [ ] Verify error handling

---

## 🆘 Still Having Issues?

### **Quick Debug Script:**
```html
<script>
// Add this to debug px64-charts issues
console.log('px64 loaded:', typeof px64 !== 'undefined');
console.log('px64Charts loaded:', typeof px64Charts !== 'undefined');
console.log('Chart binders:', Object.keys(px64.binders || {}).filter(k =>
    ['sparkline', 'chart', 'microbar'].includes(k)));
</script>
```

### **Common Quick Fixes:**
1. **Hard refresh** (Ctrl+F5) to clear cache
2. **Check network tab** for failed script loads
3. **Try incognito mode** to rule out extensions
4. **Test with minimal example** first

---

**Most issues are data or container height related. Start there first!** 🎯
