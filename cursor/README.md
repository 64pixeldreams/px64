# 🎯 Cursor AI Documentation for px64 + Charts

*This folder contains specialized documentation designed for Cursor AI to implement px64 with charts in any project.*

## 📚 Documentation Files

| File | Purpose | Use When |
|------|---------|----------|
| **[CURSOR-GUIDE.md](CURSOR-GUIDE.md)** | Complete implementation guide | Starting any px64 project |
| **[CURSOR-DASHBOARD-TEMPLATE.html](CURSOR-DASHBOARD-TEMPLATE.html)** | Full working dashboard | Need complete dashboard |
| **[CURSOR-CHART-EXAMPLES.md](CURSOR-CHART-EXAMPLES.md)** | Specific chart implementations | Adding individual charts |
| **[CURSOR-COMMON-PATTERNS.md](CURSOR-COMMON-PATTERNS.md)** | Reusable code snippets | Building custom components |
| **[CURSOR-TROUBLESHOOTING.md](CURSOR-TROUBLESHOOTING.md)** | Debug and fix issues | Something not working |

## 🚀 Quick Start for Cursor AI

### **1. Read the Main Guide First**
Start with `CURSOR-GUIDE.md` - it contains everything needed to implement px64 + charts.

### **2. Copy the Template**
Use `CURSOR-DASHBOARD-TEMPLATE.html` as a starting point for dashboard projects.

### **3. Reference Examples**
Check `CURSOR-CHART-EXAMPLES.md` for specific chart types and implementations.

### **4. Use Common Patterns**
Copy patterns from `CURSOR-COMMON-PATTERNS.md` for faster development.

### **5. Debug Issues**
Consult `CURSOR-TROUBLESHOOTING.md` if anything doesn't work as expected.

## 🎯 Key Principles for Cursor AI

### **Always Remember:**
1. **Load px64.js before px64-charts.js**
2. **Use px64.observable() for all data**
3. **Set height on chart containers**
4. **Update data with observable methods (.$push, .$set)**
5. **Test with simple data first**

### **Common Implementation Pattern:**
```html
<!-- 1. Load scripts -->
<script src="px64.js"></script>
<script src="px64-charts.js"></script>

<!-- 2. Create container with height -->
<div style="height: 300px;">
    <div data-bind="chart:salesData" data-type="line"></div>
</div>

<!-- 3. Create observable data -->
<script>
const data = px64.observable({
    salesData: [100, 120, 110, 140, 160, 180, 200]
});

px64.bind('#container', data);
</script>
```

## 🔄 Real-World Usage

### **For Dashboards:**
1. Copy `CURSOR-DASHBOARD-TEMPLATE.html`
2. Replace data with real API calls
3. Customize styling and layout
4. Add real-time updates if needed

### **For Individual Charts:**
1. Pick pattern from `CURSOR-CHART-EXAMPLES.md`
2. Adapt data structure to your needs
3. Customize colors and styling
4. Add interactivity if needed

### **For Custom Components:**
1. Use patterns from `CURSOR-COMMON-PATTERNS.md`
2. Combine multiple patterns as needed
3. Add your business logic
4. Test thoroughly

## 🚨 Troubleshooting Checklist

If charts aren't working:

1. **Check console** for error messages
2. **Verify script order** (px64.js first)
3. **Confirm container height** is set
4. **Ensure data is observable**
5. **Test with simple data** first

## 📊 Chart Types Available

| Type | Binder | Use Case |
|------|--------|----------|
| **Sparklines** | `sparkline:` | KPI cards, small trend indicators |
| **Line Charts** | `chart:` (type="line") | Trends over time |
| **Bar Charts** | `chart:` (type="bar") | Comparisons, categories |
| **Area Charts** | `chart:` (type="area") | Filled trend areas |
| **Pie Charts** | `chart:` (type="pie") | Part-to-whole relationships |
| **Micro Bars** | `microbar:` | Analytics-style horizontal bars |

## 🎨 Styling Options

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-color` | Hex color | Single color override |
| `data-theme` | bootstrap, material, pastel, dark | Color palette |
| `data-height` | Number | Chart height in pixels |
| `data-group` | String | Group charts for scaling |
| `data-type` | line, area, bar, pie, winloss | Chart type |

## 💡 Pro Tips for Cursor AI

1. **Start Simple** - Begin with basic charts, add complexity later
2. **Use Templates** - Copy from examples rather than building from scratch
3. **Test Incrementally** - Add one chart at a time
4. **Check Mobile** - Always test responsive behavior
5. **Validate Data** - Ensure data is clean and properly formatted

## 📁 File Structure for Projects

When implementing px64 + charts in a project:

```
project/
├── assets/
│   ├── px64.js              ← Core library
│   └── px64-charts.js       ← Chart extension
├── css/
│   └── dashboard.css        ← Custom styles
├── js/
│   └── dashboard.js         ← Your data and logic
└── index.html               ← Main HTML file
```

## 🎯 Success Metrics

A successful px64 + charts implementation should have:

- ✅ **Charts render immediately** on page load
- ✅ **Data updates animate smoothly**
- ✅ **Responsive design** works on mobile
- ✅ **No console errors**
- ✅ **Fast performance** even with real-time updates

---

**This documentation is specifically designed to help Cursor AI implement px64 + charts quickly and correctly. Follow the patterns and you'll have working charts in minutes!** 🚀
