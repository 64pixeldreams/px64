# 🎯 px64 + Charts: Complete Cursor Implementation Guide

*This guide teaches Cursor AI how to implement px64 with charts in any project*

## 🚀 Quick Setup (Copy-Paste Ready)

### **1. Add Scripts to Project**
```html
<!-- Add to your HTML <head> or before </body> -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"></script>
<script src="px64.js"></script>
<script src="px64-charts.js"></script>
```

### **2. Create Observable Data**
```javascript
// Dashboard state - always use px64.observable()
const dashboardData = px64.observable({
    // Metrics for sparklines
    sales: [100, 120, 110, 140, 160, 180, 200],
    users: [50, 65, 70, 85, 90, 95, 110],
    revenue: [1200, 1400, 1300, 1600, 1800, 2000, 2200],

    // Single values for KPI cards (use money: binder)
    totalSales: 125000.50,
    totalUsers: 485,
    conversionRate: 3.2,
    monthlyRevenue: 45600.75,

    // Date/time values (use date:, datetime:, timeago: binders)
    lastUpdated: new Date(),
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date(Date.now() - 3600000), // 1 hour ago

    // Bootstrap component states
    alertMessage: 'System updated successfully!',
    alertType: 'success',
    badgeStatus: 'active',
    uploadProgress: 75,

    // Form states
    isProcessing: false,
    isValid: true,
    selectedOption: 'option1',
    isChecked: true,

    // Tab/dropdown states (auto-managed by px64)
    activeTab: 'overview',

    // Chart data for full charts
    monthlyData: [
        { month: 'Jan', sales: 1200, users: 450 },
        { month: 'Feb', sales: 1400, users: 520 },
        { month: 'Mar', sales: 1300, users: 480 },
        { month: 'Apr', sales: 1600, users: 600 },
        { month: 'May', sales: 1800, users: 650 },
        { month: 'Jun', sales: 2000, users: 720 }
    ]
});
```

### **3. Bind to DOM**
```javascript
// Always bind to root container
px64.bind('#dashboard', dashboardData);
```

---

## 📊 Chart Implementation Patterns

### **Pattern 1: KPI Cards with Sparklines & Money Formatting**
```html
<div class="row" id="dashboard">
    <div class="col-md-4">
        <div class="card">
            <div class="card-body">
                <h5>Sales</h5>
                <h2 data-bind="money:totalSales" class="text-success"></h2>
                <small class="text-muted">Last updated: <span data-bind="timeago:lastUpdated"></span></small>
                <div data-bind="sparkline:sales"
                     data-color="#28a745"
                     data-height="40"></div>
            </div>
        </div>
    </div>

    <div class="col-md-4">
        <div class="card">
            <div class="card-body">
                <h5>Active Users</h5>
                <h2 data-bind="text:totalUsers" class="text-primary"></h2>
                <small class="text-muted">Since: <span data-bind="date:createdAt"></span></small>
                <div data-bind="sparkline:users"
                     data-color="#007bff"
                     data-height="40"></div>
            </div>
        </div>
    </div>

    <div class="col-md-4">
        <div class="card">
            <div class="card-body">
                <h5>Monthly Revenue</h5>
                <h2 data-bind="money:monthlyRevenue" class="text-info"></h2>
                <small class="text-muted">Last login: <span data-bind="datetime:lastLogin"></span></small>
                <div data-bind="sparkline:revenue"
                     data-type="area"
                     data-color="#17a2b8"
                     data-height="40"></div>
            </div>
        </div>
    </div>
</div>
```

### **Pattern 2: Full Charts**
```html
<!-- Line Chart -->
<div class="card">
    <div class="card-body">
        <h5>Monthly Trends</h5>
        <div style="height: 300px;">
            <div data-bind="chart:monthlyData"
                 data-type="line"
                 data-x-key="month"
                 data-y-key="sales"></div>
        </div>
    </div>
</div>

<!-- Bar Chart -->
<div class="card">
    <div class="card-body">
        <h5>User Growth</h5>
        <div style="height: 250px;">
            <div data-bind="chart:monthlyData"
                 data-type="bar"
                 data-x-key="month"
                 data-y-key="users"
                 data-color="#17a2b8"></div>
        </div>
    </div>
</div>
```

### **Pattern 3: Grouped Charts (Synchronized Scaling)**
```html
<!-- Conversion Funnel - All charts use same scale -->
<div class="row">
    <div class="col-md-4">
        <h6>Views</h6>
        <div data-bind="sparkline:viewsData"
             data-group="funnel"
             data-color="#007bff"></div>
    </div>
    <div class="col-md-4">
        <h6>Clicks</h6>
        <div data-bind="sparkline:clicksData"
             data-group="funnel"
             data-color="#28a745"></div>
    </div>
    <div class="col-md-4">
        <h6>Conversions</h6>
        <div data-bind="sparkline:conversionsData"
             data-group="funnel"
             data-color="#ffc107"></div>
    </div>
</div>
```

### **Pattern 4: Micro Bars (Analytics Style)**
```html
<div class="card">
    <div class="card-body">
        <h6>Traffic Sources</h6>

        <div class="d-flex align-items-center mb-2">
            <span class="me-3" style="width: 80px;">Direct</span>
            <div data-bind="microbar:directTraffic"
                 data-color="#007bff"
                 style="flex: 1; height: 20px;"></div>
            <span class="ms-3 text-muted" data-bind="text:directTrafficFormatted"></span>
        </div>

        <div class="d-flex align-items-center mb-2">
            <span class="me-3" style="width: 80px;">Social</span>
            <div data-bind="microbar:socialTraffic"
                 data-color="#28a745"
                 style="flex: 1; height: 20px;"></div>
            <span class="ms-3 text-muted" data-bind="text:socialTrafficFormatted"></span>
        </div>

        <div class="d-flex align-items-center mb-2">
            <span class="me-3" style="width: 80px;">Search</span>
            <div data-bind="microbar:searchTraffic"
                 data-color="#ffc107"
                 style="flex: 1; height: 20px;"></div>
            <span class="ms-3 text-muted" data-bind="text:searchTrafficFormatted"></span>
        </div>
    </div>
</div>
```

---

## 🔄 Real-Time Updates

### **Update Data (Charts Auto-Animate)**
```javascript
// Update single values
dashboardData.$set('totalSales', 1350);

// Update arrays (sparklines animate)
dashboardData.$set('sales', [120, 140, 130, 160, 180, 200, 220]);

// Add new data point
dashboardData.sales.$push(240);

// Real-time streaming
setInterval(() => {
    const newValue = Math.random() * 100 + 150;
    dashboardData.sales.$push(newValue);

    // Keep last 20 points
    if (dashboardData.sales.length > 20) {
        dashboardData.sales.$shift();
    }
}, 2000);
```

---

## 🎯 Complete px64 Binders Reference

### **Core Binders**
```html
<!-- Text & Content -->
<span data-bind="text:userName">Default text</span>
<div data-bind="html:richContent"></div>
<span data-bind="money:price">$0.00</span>

<!-- Form Controls -->
<input data-bind="value:email" type="email">
<input data-bind="checkbox:isChecked" type="checkbox">
<input data-bind="radio:selectedOption" name="option" value="option1">

<!-- Visibility -->
<div data-bind="show:isVisible">Visible content</div>
<div data-bind="hide:isHidden">Hidden content</div>
<div data-bind="fade:isLoading">Fading content</div>
<div data-bind="fadein:!isLoading">Fade in when loaded</div>

<!-- Attributes & Classes -->
<img data-bind="attr:src:imageUrl, attr:alt:imageAlt">
<div data-bind="class:active:isActive, class:selected:isSelected"></div>

<!-- Events -->
<button data-bind="tap:handleClick">Click me</button>
<button data-bind="tap:updateStatus('completed')">Update Status</button>
```

### **Date & Time Binders**
```html
<!-- Date Formatting -->
<span data-bind="date:createdAt">Jan 1, 2024</span>
<span data-bind="datetime:lastLogin">2 hours ago / Yesterday 3:45 PM</span>
<span data-bind="timeago:updatedAt">5 minutes ago</span>

<!-- Example Data -->
<script>
const data = px64.observable({
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date(Date.now() - 7200000), // 2 hours ago
    updatedAt: new Date(Date.now() - 300000)   // 5 minutes ago
});
</script>
```

### **Form State Binders**
```html
<!-- Loading & Processing States -->
<button data-bind="loading:isSubmitting, disable:isSubmitting">
    <span data-bind="text:isSubmitting ? 'Processing...' : 'Submit'"></span>
</button>

<!-- Form Validation -->
<input data-bind="value:email, valid:isEmailValid, invalid:!isEmailValid"
       class="form-control">
<div data-bind="show:!isEmailValid" class="invalid-feedback">
    Please enter a valid email
</div>

<!-- Enable/Disable Controls -->
<input data-bind="enable:!isLocked, disable:isLocked" type="text">
```

### **Bootstrap Component Binders**
```html
<!-- Dynamic Alerts -->
<div data-bind="alert:alertMessage, show:alertMessage"
     class="alert alert-success">
    Alert content goes here
</div>

<!-- Auto-Colored Badges -->
<span data-bind="badge:status">Status text</span>
<!-- Automatically colors: success=green, warning=yellow, danger=red, etc. -->

<!-- Progress Bars -->
<div class="progress">
    <div data-bind="progress:uploadProgress"
         class="progress-bar"
         role="progressbar"></div>
</div>
```

### **Bootstrap Auto-Wiring (Zero JS Required!)**

**Dropdowns - Just Use Bootstrap Markup:**
```html
<div class="dropdown">
    <button class="btn btn-secondary dropdown-toggle"
            data-bs-toggle="dropdown">
        Dropdown
    </button>
    <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#">Action</a></li>
        <li><a class="dropdown-item" href="#">Another action</a></li>
    </ul>
</div>
<!-- px64 automatically handles: click outside to close, escape key, ARIA -->
```

**Tabs - Just Use Bootstrap Markup:**
```html
<ul class="nav nav-tabs">
    <li class="nav-item">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#home">
            Home
        </button>
    </li>
    <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#profile">
            Profile
        </button>
    </li>
</ul>

<div class="tab-content">
    <div class="tab-pane fade show active" id="home">Home content</div>
    <div class="tab-pane fade" id="profile">Profile content</div>
</div>
<!-- px64 automatically manages active states and content switching -->
```

### **Advanced List & Table Binders**

**Simple List:**
```html
<ul data-bind="list:todos">
    <template>
        <li>
            <input type="checkbox" data-bind="checkbox:done">
            <span data-bind="text:text, class:completed:done"></span>
            <button data-bind="tap:remove">Delete</button>
        </li>
    </template>
</ul>
```

**Data Table with Auto-Generated Headers & Sorting:**
```html
<!-- px64 automatically creates headers and renders data -->
<table data-bind="table:employees"
       data-meta="cols:name,email,role,salary,created;sort:name"
       class="table table-striped">
    <!-- Headers and rows auto-generated by px64 -->
    <!-- Click column headers to sort -->
</table>
```

**JavaScript for Table:**
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
        },
        {
            name: 'Mike Johnson',
            email: 'mike@company.com',
            role: 'Manager',
            salary: 85000,
            created: new Date('2022-11-10')
        }
    ])
});

// Table features:
// - Auto-generated headers from cols: metadata
// - Click headers to sort (automatic)
// - Supports listState pagination and filtering
// - Renders any property from data objects
```

**Table with Custom Formatting:**
```html
<table data-bind="table:transactions"
       data-meta="cols:date,description,amount,status"
       class="table">
    <!-- After table renders, you can enhance cells -->
</table>

<script>
// Enhance table after rendering
const transactions = px64.listState([
    {
        date: new Date('2024-01-15'),
        description: 'Payment received',
        amount: 1250.50,
        status: 'completed'
    }
]);

// px64 will render basic values, then you can format specific cells
setTimeout(() => {
    // Format money columns
    document.querySelectorAll('[data-bind*="table"] td:nth-child(3)').forEach(cell => {
        const value = parseFloat(cell.textContent);
        if (!isNaN(value)) {
            cell.textContent = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(value);
        }
    });

    // Format date columns
    document.querySelectorAll('[data-bind*="table"] td:nth-child(1)').forEach(cell => {
        const dateStr = cell.textContent;
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            cell.textContent = date.toLocaleDateString();
        }
    });
}, 100);
</script>
```

**Table Data Meta Options:**
- `cols:name,email,role` - Columns to display
- `sort:name` - Default sort column
- `dir:desc` - Default sort direction (asc/desc)
- Click any header to sort by that column
- Supports all listState features (pagination, filtering)

### **Custom Tab Binder (Alternative to Bootstrap)**
```html
<!-- Manual Tab Control -->
<div class="nav nav-pills">
    <button data-bind="tab:activeTab, class:active:activeTab === 'overview'"
            data-tab-id="overview">Overview</button>
    <button data-bind="tab:activeTab, class:active:activeTab === 'analytics'"
            data-tab-id="analytics">Analytics</button>
</div>

<div data-bind="tab:activeTab, show:activeTab === 'overview'"
     data-tab-content="overview">
    Overview content
</div>
<div data-bind="tab:activeTab, show:activeTab === 'analytics'"
     data-tab-content="analytics">
    Analytics content
</div>
```

---

## 🎨 Styling & Themes

### **Built-in Color Themes**
```html
<!-- Bootstrap theme (default) -->
<div data-bind="sparkline:data" data-theme="bootstrap"></div>

<!-- Material theme -->
<div data-bind="sparkline:data" data-theme="material"></div>

<!-- Pastel theme -->
<div data-bind="sparkline:data" data-theme="pastel"></div>

<!-- Dark theme -->
<div data-bind="sparkline:data" data-theme="dark"></div>

<!-- Custom color -->
<div data-bind="sparkline:data" data-color="#ff6b6b"></div>
```

### **Chart Types**
```html
<!-- Sparklines -->
<div data-bind="sparkline:data" data-type="line"></div>      <!-- Default -->
<div data-bind="sparkline:data" data-type="area"></div>      <!-- Filled area -->
<div data-bind="sparkline:data" data-type="bar"></div>       <!-- Mini bars -->
<div data-bind="sparkline:data" data-type="winloss"></div>   <!-- Win/loss -->

<!-- Full Charts -->
<div data-bind="chart:data" data-type="line"></div>          <!-- Line chart -->
<div data-bind="chart:data" data-type="bar"></div>           <!-- Bar chart -->
<div data-bind="chart:data" data-type="area"></div>          <!-- Area chart -->
<div data-bind="chart:data" data-type="pie"></div>           <!-- Pie chart -->
```

---

## ⚡ Performance Tips

### **1. Batch Updates**
```javascript
// Good - Single update
dashboardData.$set('sales', newSalesArray);

// Avoid - Multiple rapid updates
dashboardData.sales.forEach(item => dashboardData.sales.$push(item)); // Slow
```

### **2. Group Related Charts**
```html
<!-- Charts in same group share scale calculations -->
<div data-bind="sparkline:views" data-group="metrics"></div>
<div data-bind="sparkline:clicks" data-group="metrics"></div>
<div data-bind="sparkline:conversions" data-group="metrics"></div>
```

### **3. Proper Container Sizing**
```html
<!-- Always set height on chart containers -->
<div style="height: 300px;">
    <div data-bind="chart:data"></div>
</div>
```

---

## 🚨 Common Mistakes to Avoid

### **❌ Don't Do This:**
```javascript
// Wrong - Not observable
const data = { sales: [1,2,3] };
px64.bind('#chart', data);

// Wrong - No container height
<div data-bind="chart:data"></div>

// Wrong - Updating non-observable data
data.sales.push(4); // Won't trigger updates
```

### **✅ Do This Instead:**
```javascript
// Correct - Observable data
const data = px64.observable({ sales: [1,2,3] });
px64.bind('#chart', data);

// Correct - Proper container
<div style="height: 300px;">
    <div data-bind="chart:data"></div>
</div>

// Correct - Observable updates
data.sales.$push(4); // Triggers chart animation
```

---

## 🎯 Complete Dashboard Template

See `CURSOR-DASHBOARD-TEMPLATE.html` for a complete, copy-paste dashboard implementation.

## 📚 Next Steps

1. **Read**: `CURSOR-CHART-EXAMPLES.md` for specific chart implementations
2. **Copy**: `CURSOR-COMMON-PATTERNS.md` for reusable code snippets
3. **Debug**: `CURSOR-TROUBLESHOOTING.md` for common issues

---

**This guide gives you everything needed to implement px64 + charts in any project. The charts are lightweight, reactive, and performant!** 🚀
