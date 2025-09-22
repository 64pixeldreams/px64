/**
 * Universal Chart Framework
 * Reusable chart rendering for NimbusAI, AIVERIE, and future projects
 *
 * Features:
 * - Auto-detects chart type from container
 * - Responsive design with AdminKit styling
 * - Sparkline support for dashboard cards
 * - Easy integration with CFramework
 */

class ChartFramework {
    constructor() {
        this.charts = new Map(); // Track chart instances
        this.defaultColors = [
            'rgba(0, 123, 255, 0.8)',   // Blue
            'rgba(40, 167, 69, 0.8)',   // Green
            'rgba(255, 193, 7, 0.8)',   // Yellow
            'rgba(220, 53, 69, 0.8)',   // Red
            'rgba(23, 162, 184, 0.8)',  // Cyan
            'rgba(108, 117, 125, 0.8)'  // Gray
        ];
    }

    /**
     * Render a chart in a container
     * @param {string} containerId - DOM element ID
     * @param {object} data - Chart.js data object
     * @param {object} options - Chart configuration options
     */
    async renderChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Chart container not found: ${containerId}`);
            return null;
        }

        // Get or create canvas
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            // Set canvas size to match container
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            container.innerHTML = ''; // Clear container first
            container.appendChild(canvas);
            console.log(`ðŸ“Š Created canvas for ${containerId}`);
        }

        // Determine chart type from container classes or options
        const chartType = this._detectChartType(container, options);

        // Build chart configuration
        const config = this._buildChartConfig(chartType, data, options, container);

        // Destroy existing chart if it exists
        const existingChart = this.charts.get(containerId);
        if (existingChart) {
            existingChart.destroy();
        }

        // Create new chart
        try {
            const chart = new Chart(canvas, config);
            this.charts.set(containerId, chart);

            console.log(`âœ… Chart rendered: ${containerId} (${chartType})`);
            return chart;

        } catch (error) {
            console.error(`âŒ Chart render failed: ${containerId}`, error);
            this._showError(container, 'Chart failed to load');
            return null;
        }
    }

    /**
     * Render a sparkline (mini chart for dashboard cards)
     * @param {string} containerId - DOM element ID
     * @param {Array} data - Simple data array
     * @param {string} color - Line color
     */
    renderSparkline(containerId, data, color = '#007bff') {
        // Ensure we have data
        const chartData = Array.isArray(data) && data.length > 0 ? data : [0, 0, 0, 0, 0];

        const sparklineData = {
            labels: chartData.map((_, i) => ''), // Empty labels
            datasets: [{
                data: chartData,
                borderColor: color,
                backgroundColor: 'transparent',
                borderWidth: 3,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0.4
            }]
        };

        console.log(`ðŸŽ¨ Sparkline data for ${containerId}:`, {
            color,
            dataLength: chartData.length,
            dataRange: `${Math.min(...chartData)}-${Math.max(...chartData)}`,
            sampleValues: chartData.slice(0, 5)
        });

        const sparklineOptions = {
            type: 'sparkline',
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800 }
        };

        return this.renderChart(containerId, sparklineData, sparklineOptions);
    }

    /**
     * Update existing chart with new data
     * @param {string} containerId - DOM element ID
     * @param {object} newData - New chart data
     */
    updateChart(containerId, newData) {
        const chart = this.charts.get(containerId);
        if (!chart) {
            console.warn(`Chart not found for update: ${containerId}`);
            return;
        }

        chart.data = newData;
        chart.update('active');
    }

    /**
     * Destroy chart and clean up
     * @param {string} containerId - DOM element ID
     */
    destroyChart(containerId) {
        const chart = this.charts.get(containerId);
        if (chart) {
            chart.destroy();
            this.charts.delete(containerId);
        }
    }

    // Private helper methods
    _detectChartType(container, options) {
        if (options.type) return options.type;

        // Detect from CSS classes
        if (container.classList.contains('sparkline')) return 'sparkline';
        if (container.classList.contains('bar-chart')) return 'bar';
        if (container.classList.contains('doughnut-chart')) return 'doughnut';
        if (container.classList.contains('pie-chart')) return 'pie';

        // Default to line chart
        return 'line';
    }

    _buildChartConfig(chartType, data, options, container) {
        // Base configuration
        let config = {
            type: chartType === 'sparkline' ? 'line' : chartType,
            data: this._processChartData(data, chartType),
            options: this._buildChartOptions(chartType, options, container)
        };

        return config;
    }

    _processChartData(data, chartType) {
        // Ensure datasets have colors if not specified
        if (data.datasets) {
            data.datasets.forEach((dataset, index) => {
                if (!dataset.borderColor && !dataset.backgroundColor) {
                    const color = this.defaultColors[index % this.defaultColors.length];
                    dataset.borderColor = color;
                    dataset.backgroundColor = color.replace('0.8', '0.2');
                }
            });
        }

        return data;
    }

    _buildChartOptions(chartType, userOptions, container) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            }
        };

        // Type-specific options
        const typeOptions = this._getTypeSpecificOptions(chartType, container);

        // Merge options (user options override defaults)
        return this._mergeDeep(baseOptions, typeOptions, userOptions);
    }

    _getTypeSpecificOptions(chartType, container) {
        const options = {};

        switch (chartType) {
            case 'sparkline':
                return {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: {
                            display: false,
                            grid: { display: false }
                        },
                        y: {
                            display: false,
                            grid: { display: false }
                        }
                    },
                    elements: {
                        point: {
                            radius: 0,
                            hoverRadius: 0
                        },
                        line: {
                            tension: 0.4,
                            borderWidth: 2
                        }
                    }
                };

            case 'line':
                return {
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        }
                    }
                };

            case 'bar':
                return {
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        }
                    }
                };

            case 'doughnut':
            case 'pie':
                return {
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                };

            default:
                return {};
        }
    }

    _showError(container, message) {
        container.innerHTML = `
      <div class="text-center text-muted p-3">
        <i class="fas fa-exclamation-triangle"></i>
        <br><small>${message}</small>
      </div>
    `;
    }

    _mergeDeep(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this._isObject(target) && this._isObject(source)) {
            for (const key in source) {
                if (this._isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this._mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this._mergeDeep(target, ...sources);
    }

    _isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
}

// Create global instance
window.ChartFramework = new ChartFramework();

// Auto-initialize charts on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('ðŸ“Š Chart Framework initialized');
});
