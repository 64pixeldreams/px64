/**
 * PX64 Charts Extension
 * Lightweight canvas-based charting for px64
 * Auto-registers chart binders with px64
 */

(function () {
    'use strict';

    // Ensure px64 is loaded
    if (typeof px64 === 'undefined') {
        console.error('px64-charts requires px64.js to be loaded first');
        return;
    }

    // Chart engine core
    class PX64Charts {
        constructor() {
            this.charts = new Map();
            this.groups = new Map();
            this.animations = new Map();
            this.themes = {
                bootstrap: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
                material: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'],
                pastel: ['#A8E6CF', '#FFD3A5', '#FD8A8A', '#A8D8EA', '#C7CEEA', '#F8D7DA'],
                dark: ['#495057', '#6c757d', '#adb5bd', '#ced4da', '#dee2e6', '#f8f9fa']
            };
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

        resizeAll() {
            this.charts.forEach((chart, id) => {
                this.resizeChart(id);
            });
        }

        resizeChart(chartId) {
            const chart = this.charts.get(chartId);
            if (!chart) return;

            const newSize = this.getParentSize(chart.element);
            if (newSize.width !== chart.width || newSize.height !== chart.height) {
                this.resizeCanvas(chart.canvas, newSize.width, newSize.height);
                chart.width = newSize.width;
                chart.height = newSize.height;
                chart.render();
            }
        }

        getParentSize(element) {
            const parent = element.parentElement;
            const computedStyle = window.getComputedStyle(parent);
            return {
                width: parent.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight),
                height: parent.clientHeight - parseFloat(computedStyle.paddingTop) - parseFloat(computedStyle.paddingBottom)
            };
        }

        resizeCanvas(canvas, width, height) {
            const ratio = window.devicePixelRatio || 1;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.getContext('2d').scale(ratio, ratio);
        }

        createChart(element, type, data, options = {}) {
            const chartId = `chart_${Math.random().toString(36).substr(2, 9)}`;

            // Get parent size
            const size = this.getParentSize(element);

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';

            // Clear element and add canvas
            element.innerHTML = '';
            element.appendChild(canvas);

            // Size canvas properly
            this.resizeCanvas(canvas, size.width, size.height);

            // Create chart object
            const chart = {
                id: chartId,
                element,
                canvas,
                type,
                data,
                options,
                width: size.width,
                height: size.height,
                group: options.group,
                render: () => this.renderChart(chartId)
            };

            this.charts.set(chartId, chart);

            // Add to group if specified
            if (options.group) {
                this.addToGroup(chartId, options.group, data);
            }

            chart.render();

            return chart;
        }

        renderChart(chartId) {
            const chart = this.charts.get(chartId);
            if (!chart) return;

            const ctx = chart.canvas.getContext('2d');
            ctx.clearRect(0, 0, chart.width, chart.height);

            switch (chart.type) {
                case 'sparkline':
                    this.renderSparkline(ctx, chart);
                    break;
                case 'line':
                    this.renderLineChart(ctx, chart);
                    break;
                case 'bar':
                    this.renderBarChart(ctx, chart);
                    break;
                case 'area':
                    this.renderAreaChart(ctx, chart);
                    break;
                case 'pie':
                    this.renderPieChart(ctx, chart);
                    break;
                case 'microbar':
                    this.renderMicroBar(ctx, chart);
                    break;
            }
        }

        renderSparkline(ctx, chart) {
            const { data, width, height, options } = chart;
            const color = options.color || '#007bff';
            const padding = 2;
            const type = options.type || 'line';

            if (!Array.isArray(data) || data.length < 2) return;

            // Get scale from group or calculate individually
            let minVal, maxVal;
            if (chart.group && this.groups.has(chart.group)) {
                const groupScale = this.getGroupScale(chart.group);
                minVal = groupScale.min;
                maxVal = groupScale.max;
            } else {
                minVal = Math.min(...data);
                maxVal = Math.max(...data);
            }

            const range = maxVal - minVal || 1;
            const stepX = (width - padding * 2) / (data.length - 1);
            const scaleY = (height - padding * 2) / range;

            switch (type) {
                case 'area':
                    this.renderAreaSparkline(ctx, data, minVal, width, height, padding, stepX, scaleY, color);
                    break;
                case 'bar':
                    this.renderBarSparkline(ctx, data, minVal, width, height, padding, stepX, scaleY, color);
                    break;
                case 'winloss':
                    this.renderWinLossSparkline(ctx, data, width, height, padding, stepX, options);
                    break;
                case 'line':
                default:
                    this.renderLineSparkline(ctx, data, minVal, width, height, padding, stepX, scaleY, color);
                    break;
            }
        }

        renderLineSparkline(ctx, data, minVal, width, height, padding, stepX, scaleY, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();

            data.forEach((value, i) => {
                const x = padding + i * stepX;
                const y = height - padding - (value - minVal) * scaleY;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }

        renderAreaSparkline(ctx, data, minVal, width, height, padding, stepX, scaleY, color) {
            // Create gradient fill that fades to transparent at bottom
            const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
            gradient.addColorStop(0, this.addOpacity(color, 0.4)); // 40% at top
            gradient.addColorStop(1, this.addOpacity(color, 0.05)); // 5% at bottom (fade)

            ctx.fillStyle = gradient;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(padding, height - padding);

            data.forEach((value, i) => {
                const x = padding + i * stepX;
                const y = height - padding - (value - minVal) * scaleY;
                ctx.lineTo(x, y);
            });

            ctx.lineTo(padding + (data.length - 1) * stepX, height - padding);
            ctx.closePath();
            ctx.fill();

            // Draw line on top
            ctx.beginPath();
            data.forEach((value, i) => {
                const x = padding + i * stepX;
                const y = height - padding - (value - minVal) * scaleY;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }

        renderBarSparkline(ctx, data, minVal, width, height, padding, stepX, scaleY, color) {
            const barWidth = Math.max(1, stepX * 0.8);

            data.forEach((value, i) => {
                const x = padding + i * stepX - barWidth / 2;
                const barHeight = (value - minVal) * scaleY;
                const y = height - padding - barHeight;

                // Create gradient for each bar - solid at top, 50% at bottom
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, color); // 100% opacity at top
                gradient.addColorStop(1, this.addOpacity(color, 0.5)); // 50% opacity at bottom

                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth, barHeight);
            });
        }

        renderWinLossSparkline(ctx, data, width, height, padding, stepX, options) {
            const barWidth = Math.max(1, stepX * 0.8);
            const midY = height / 2;
            const winColor = options.winColor || '#28a745';
            const lossColor = options.lossColor || '#dc3545';

            data.forEach((value, i) => {
                const x = padding + i * stepX - barWidth / 2;
                const isWin = value > 0;
                const barHeight = Math.abs(value) * (height - padding * 2) / 2;

                ctx.fillStyle = isWin ? winColor : lossColor;

                if (isWin) {
                    ctx.fillRect(x, midY - barHeight, barWidth, barHeight);
                } else {
                    ctx.fillRect(x, midY, barWidth, barHeight);
                }
            });
        }

        renderLineChart(ctx, chart) {
            // Full line chart with axes and labels
            const { data, width, height, options } = chart;
            const color = options.color || '#007bff';
            const padding = 40;

            if (!Array.isArray(data) || data.length < 2) return;

            // Get scale
            let minVal, maxVal;
            if (chart.group && this.groups.has(chart.group)) {
                const groupScale = this.getGroupScale(chart.group);
                minVal = groupScale.min;
                maxVal = groupScale.max;
            } else {
                minVal = Math.min(...data);
                maxVal = Math.max(...data);
            }

            const range = maxVal - minVal || 1;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;
            const stepX = chartWidth / (data.length - 1);
            const scaleY = chartHeight / range;

            // Draw axes
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.stroke();

            // Draw data line
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();

            data.forEach((value, i) => {
                const x = padding + i * stepX;
                const y = height - padding - (value - minVal) * scaleY;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }

        renderBarChart(ctx, chart) {
            // Full bar chart with axes
            const { data, width, height, options } = chart;
            const color = options.color || '#007bff';
            const padding = 40;

            if (!Array.isArray(data) || data.length < 1) return;

            // Get scale
            let minVal, maxVal;
            if (chart.group && this.groups.has(chart.group)) {
                const groupScale = this.getGroupScale(chart.group);
                minVal = groupScale.min;
                maxVal = groupScale.max;
            } else {
                minVal = Math.min(...data);
                maxVal = Math.max(...data);
            }

            const range = maxVal - minVal || 1;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;
            const barWidth = chartWidth / data.length * 0.8;
            const scaleY = chartHeight / range;

            // Draw axes
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.stroke();

            // Draw bars with gradient (solid at top, 50% at bottom)
            data.forEach((value, i) => {
                const x = padding + (i * chartWidth / data.length) + (chartWidth / data.length - barWidth) / 2;
                const barHeight = (value - minVal) * scaleY;
                const y = height - padding - barHeight;

                // Create gradient for each bar
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, color); // 100% opacity at top
                gradient.addColorStop(1, this.addOpacity(color, 0.5)); // 50% opacity at bottom

                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth, barHeight);
            });
        }

        renderAreaChart(ctx, chart) {
            // Area chart - filled line chart
            const { data, width, height, options } = chart;
            const color = options.color || '#007bff';
            const padding = 40;

            if (!Array.isArray(data) || data.length < 2) return;

            // Get scale
            let minVal, maxVal;
            if (chart.group && this.groups.has(chart.group)) {
                const groupScale = this.getGroupScale(chart.group);
                minVal = groupScale.min;
                maxVal = groupScale.max;
            } else {
                minVal = Math.min(...data);
                maxVal = Math.max(...data);
            }

            const range = maxVal - minVal || 1;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;
            const stepX = chartWidth / (data.length - 1);
            const scaleY = chartHeight / range;

            // Draw axes
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.stroke();

            // Create gradient fill that fades to transparent at bottom
            const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
            gradient.addColorStop(0, px64Charts.addOpacity(color, 0.4)); // 40% at top
            gradient.addColorStop(1, px64Charts.addOpacity(color, 0.05)); // 5% at bottom (fade)

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(padding, height - padding);

            data.forEach((value, i) => {
                const x = padding + i * stepX;
                const y = height - padding - (value - minVal) * scaleY;
                ctx.lineTo(x, y);
            });

            ctx.lineTo(padding + (data.length - 1) * stepX, height - padding);
            ctx.closePath();
            ctx.fill();

            // Draw line on top
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            data.forEach((value, i) => {
                const x = padding + i * stepX;
                const y = height - padding - (value - minVal) * scaleY;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }

        renderPieChart(ctx, chart) {
            // Pie chart for categorical data
            const { data, width, height, options } = chart;
            const padding = 20;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - padding;

            if (!Array.isArray(data) || data.length < 1) return;

            const total = data.reduce((sum, val) => sum + Math.abs(val), 0);
            if (total === 0) return;

            let currentAngle = -Math.PI / 2; // Start at top

            data.forEach((value, i) => {
                const sliceAngle = (Math.abs(value) / total) * 2 * Math.PI;
                const color = options.theme ?
                    px64Charts.getThemeColor(options.theme, i) :
                    `hsl(${i * 360 / data.length}, 70%, 50%)`;

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.fill();

                // Draw slice border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                currentAngle += sliceAngle;
            });
        }

        renderMicroBar(ctx, chart) {
            const { data, width, height, options } = chart;
            const color = options.color || '#007bff';
            const value = Array.isArray(data) ? data[0] : data; // Single value

            // Get max value for scaling
            let maxValue;
            if (chart.group && this.groups.has(chart.group)) {
                const group = this.groups.get(chart.group);
                maxValue = Math.max(...group.map(c => Array.isArray(c.data) ? c.data[0] : c.data));
            } else {
                maxValue = options.max || 100;
            }

            const percentage = Math.min(value / maxValue, 1); // Cap at 100%

            // Background bar (light gray)
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, width, height);

            // Colored bar (scaled) - no text, just pure bar
            const barWidth = width * percentage;
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, barWidth, height);
        }

        formatValue(value) {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value.toString();
        }

        updateChart(chartId, newData) {
            const chart = this.charts.get(chartId);
            if (!chart) return;

            // Cancel any existing animation
            if (this.animations.has(chartId)) {
                cancelAnimationFrame(this.animations.get(chartId));
            }

            // Store old data for interpolation
            const oldData = Array.isArray(chart.data) ? [...chart.data] : [chart.data];
            chart.data = newData;

            // Update group if chart belongs to one
            if (chart.group) {
                this.updateChartInGroup(chartId, newData);
            }

            // Animate the transition
            this.animateChart(chartId, oldData, newData);
        }

        animateChart(chartId, fromData, toData) {
            const chart = this.charts.get(chartId);
            if (!chart) return;

            const duration = 300; // 300ms animation
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (ease-out)
                const eased = 1 - Math.pow(1 - progress, 3);

                // Interpolate between old and new data
                const interpolatedData = this.interpolateData(fromData, toData, eased);

                // Temporarily set interpolated data and render
                const originalData = chart.data;
                chart.data = interpolatedData;
                chart.render();
                chart.data = originalData;

                if (progress < 1) {
                    const animationId = requestAnimationFrame(animate);
                    this.animations.set(chartId, animationId);
                } else {
                    // Animation complete - final render with actual data
                    this.animations.delete(chartId);
                    chart.render();
                }
            };

            const animationId = requestAnimationFrame(animate);
            this.animations.set(chartId, animationId);
        }

        interpolateData(fromData, toData, progress) {
            // Handle single values (microbar) vs arrays (other charts)
            if (!Array.isArray(toData)) {
                const fromValue = Array.isArray(fromData) ? fromData[0] || 0 : fromData || 0;
                return fromValue + (toData - fromValue) * progress;
            }

            const fromArray = Array.isArray(fromData) ? fromData : [fromData || 0];
            const maxLength = Math.max(fromArray.length, toData.length);
            const result = [];

            for (let i = 0; i < maxLength; i++) {
                const fromValue = fromArray[i] || 0;
                const toValue = toData[i] || 0;
                result[i] = fromValue + (toValue - fromValue) * progress;
            }

            return result;
        }

        getThemeColor(themeName, index = 0) {
            if (!themeName || !this.themes[themeName]) {
                return '#007bff'; // Default blue
            }
            const colors = this.themes[themeName];
            return colors[index % colors.length];
        }

        addOpacity(color, opacity) {
            // Convert hex to rgba with opacity
            if (color.startsWith('#')) {
                const hex = color.slice(1);
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            // If already rgba, replace the alpha
            if (color.includes('rgba')) {
                return color.replace(/[\d\.]+\)$/, `${opacity})`);
            }
            // Fallback
            return color;
        }

        addToGroup(chartId, groupName, data) {
            if (!this.groups.has(groupName)) {
                this.groups.set(groupName, []);
            }
            this.groups.get(groupName).push({ chartId, data });
            this.updateGroupScale(groupName);
        }

        updateGroupScale(groupName) {
            const group = this.groups.get(groupName);
            if (!group) return;

            // Find min/max across all charts in group
            let allValues = [];
            group.forEach(chart => {
                if (Array.isArray(chart.data)) {
                    allValues = allValues.concat(chart.data);
                }
            });

            if (allValues.length === 0) return;

            const rawMin = Math.min(...allValues);
            const rawMax = Math.max(...allValues);

            // Get scaling mode from first chart in group (or default)
            const firstChart = this.charts.get(group[0].chartId);
            const scaleMode = firstChart?.options?.scaleMode || 'linear';

            let groupScale;

            // Just use simple linear scaling - it works correctly
            groupScale = { min: rawMin, max: rawMax };

            // Store group scale
            this.groups.get(groupName).scale = groupScale;
            this.groups.get(groupName).scaleMode = scaleMode;

            // Re-render all charts in group
            group.forEach(chart => {
                if (this.charts.has(chart.chartId)) {
                    this.charts.get(chart.chartId).render();
                }
            });
        }

        calculateProportionalScale(group, allValues) {
            // Simple proportional: Use 50% of max value as the scale
            // This dramatically compresses the top and gives much more space to smaller values
            const rawMax = Math.max(...allValues);
            const compressedMax = rawMax * 0.5;

            return {
                min: 0,
                max: compressedMax,
                mode: 'proportional'
            };
        }

        calculateSegmentedScale(group, allValues) {
            // Segmented mode: Each chart gets equal visual space but shows proportional magnitude
            const rawMin = Math.min(...allValues);
            const rawMax = Math.max(...allValues);
            const range = rawMax - rawMin;

            // Divide the visual space into segments based on data magnitude
            // This gives small values more visual space while preserving relationships
            const segments = [];
            let totalMagnitude = 0;

            // Calculate magnitude for each chart
            group.forEach(chart => {
                if (Array.isArray(chart.data) && chart.data.length > 0) {
                    const chartMax = Math.max(...chart.data);
                    segments.push({
                        chartId: chart.chartId,
                        magnitude: chartMax,
                        data: chart.data
                    });
                    totalMagnitude += chartMax;
                }
            });

            // Assign visual segments (each gets minimum 15% of height)
            const minSegmentSize = 0.15;
            const availableSpace = 1.0 - (segments.length * minSegmentSize);

            segments.forEach(segment => {
                const proportionalSpace = (segment.magnitude / totalMagnitude) * availableSpace;
                segment.visualSpace = minSegmentSize + proportionalSpace;
            });

            return {
                min: rawMin,
                max: rawMax,
                mode: 'segmented',
                segments: segments
            };
        }

        calculateVisibilityScale(group, allValues) {
            // Visibility mode: Ensures smallest values use at least 20% of chart height
            const rawMin = Math.min(...allValues);
            const rawMax = Math.max(...allValues);
            const range = rawMax - rawMin;

            // Calculate what the min should be so small values get 20% height
            // If smallest value is X and max is Y, we want X to be at 20% height
            // So: (X - newMin) / (Y - newMin) = 0.2
            // Solving: newMin = (X - 0.2*Y) / 0.8
            const targetMin = (rawMin - 0.2 * rawMax) / 0.8;

            return {
                min: Math.max(0, targetMin),
                max: rawMax,
                mode: 'visibility'
            };
        }

        calculateLogarithmicScale(min, max) {
            // Logarithmic scaling for very wide ranges
            const logMin = min > 0 ? Math.log10(min) : 0;
            const logMax = Math.log10(max);

            return {
                min: min,
                max: max,
                logMin: logMin,
                logMax: logMax,
                mode: 'logarithmic'
            };
        }

        getGroupScale(groupName) {
            const group = this.groups.get(groupName);
            return group && group.scale ? group.scale : { min: 0, max: 100 };
        }

        updateChartInGroup(chartId, newData) {
            const chart = this.charts.get(chartId);
            if (!chart || !chart.group) return;

            // Update data in group
            const group = this.groups.get(chart.group);
            if (group) {
                const chartInGroup = group.find(c => c.chartId === chartId);
                if (chartInGroup) {
                    chartInGroup.data = newData;
                }
                this.updateGroupScale(chart.group);
            }
        }
    }

    // Sparkline binder
    const sparklineBinder = ({ el, scope, arg }) => {
        const getValue = () => {
            const parts = arg.split('.');
            let current = scope;
            for (const part of parts) {
                if (current && typeof current === 'object') {
                    current = current[part];
                } else {
                    return [];
                }
            }
            return Array.isArray(current) ? current : [];
        };

        const getThemeColor = (themeName, index = 0) => {
            const themes = {
                bootstrap: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
                material: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'],
                pastel: ['#A8E6CF', '#FFD3A5', '#FD8A8A', '#A8D8EA', '#C7CEEA', '#F8D7DA'],
                dark: ['#495057', '#6c757d', '#adb5bd', '#ced4da', '#dee2e6', '#f8f9fa']
            };
            if (!themeName || !themes[themeName]) return '#007bff';
            return themes[themeName][index % themes[themeName].length];
        };

        const options = {
            color: el.getAttribute('data-color') || getThemeColor(el.getAttribute('data-theme'), 0),
            height: parseInt(el.getAttribute('data-height')) || 40,
            group: el.getAttribute('data-group') || null,
            type: el.getAttribute('data-type') || 'line',
            winColor: el.getAttribute('data-win-color') || '#28a745',
            lossColor: el.getAttribute('data-loss-color') || '#dc3545',
            theme: el.getAttribute('data-theme') || null
        };

        // Set element height if specified
        if (options.height) {
            el.style.height = options.height + 'px';
        }

        // Create initial chart
        const data = getValue();
        const chart = px64Charts.createChart(el, 'sparkline', data, options);

        // Watch for data changes
        if (scope && scope.$observe) {
            scope.$observe(arg, (newData) => {
                px64Charts.updateChart(chart.id, Array.isArray(newData) ? newData : []);
            });
        }
    };

    // Chart binder for full charts
    const chartBinder = ({ el, scope, arg }) => {
        const getValue = () => {
            const parts = arg.split('.');
            let current = scope;
            for (const part of parts) {
                if (current && typeof current === 'object') {
                    current = current[part];
                } else {
                    return [];
                }
            }
            return Array.isArray(current) ? current : [];
        };

        const options = {
            color: el.getAttribute('data-color') || '#007bff',
            height: parseInt(el.getAttribute('data-height')) || 200,
            group: el.getAttribute('data-group') || null,
            type: el.getAttribute('data-type') || 'line'
        };

        // Set element height if specified
        if (options.height) {
            el.style.height = options.height + 'px';
        }

        // Create initial chart
        const data = getValue();
        const chart = px64Charts.createChart(el, options.type, data, options);

        // Watch for data changes
        if (scope && scope.$observe) {
            scope.$observe(arg, (newData) => {
                px64Charts.updateChart(chart.id, Array.isArray(newData) ? newData : []);
            });
        }
    };

    // Microbar binder for single-value horizontal bars
    const microbarBinder = ({ el, scope, arg }) => {
        const getValue = () => {
            const parts = arg.split('.');
            let current = scope;
            for (const part of parts) {
                if (current && typeof current === 'object') {
                    current = current[part];
                } else {
                    return 0;
                }
            }
            return typeof current === 'number' ? current : 0;
        };

        const getThemeColor = (themeName, index = 0) => {
            const themes = {
                bootstrap: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
                material: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'],
                pastel: ['#A8E6CF', '#FFD3A5', '#FD8A8A', '#A8D8EA', '#C7CEEA', '#F8D7DA'],
                dark: ['#495057', '#6c757d', '#adb5bd', '#ced4da', '#dee2e6', '#f8f9fa']
            };
            if (!themeName || !themes[themeName]) return '#007bff';
            return themes[themeName][index % themes[themeName].length];
        };

        const options = {
            color: el.getAttribute('data-color') || getThemeColor(el.getAttribute('data-theme'), 0),
            height: parseInt(el.getAttribute('data-height')) || 20,
            group: el.getAttribute('data-group') || null,
            max: parseInt(el.getAttribute('data-max')) || null,
            theme: el.getAttribute('data-theme') || null
        };

        // Set element height if specified
        if (options.height) {
            el.style.height = options.height + 'px';
        }

        // Create initial chart
        const data = getValue();
        const chart = px64Charts.createChart(el, 'microbar', data, options);

        // Watch for data changes
        if (scope && scope.$observe) {
            scope.$observe(arg, (newData) => {
                const value = typeof newData === 'number' ? newData : 0;
                px64Charts.updateChart(chart.id, value);
            });
        }
    };

    // Auto-register binders with px64
    px64.addBinder('sparkline', sparklineBinder);
    px64.addBinder('chart', chartBinder);
    px64.addBinder('microbar', microbarBinder);

    console.log('📊 px64-charts loaded - sparkline, chart, and microbar binders registered');

    // Expose chart engine globally
    window.px64Charts = new PX64Charts();
})();
