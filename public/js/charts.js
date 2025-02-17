class Analytics {
    constructor() {
        this.visitsChart = null;
        this.initializeCharts();
    }

    initializeCharts() {
        const ctx = document.getElementById('visitsChart').getContext('2d');
        
        // Create gradient for the chart
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(67, 97, 238, 0.3)');
        gradient.addColorStop(1, 'rgba(67, 97, 238, 0)');

        this.visitsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Visits',
                    data: [],
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#4361ee',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#4361ee',
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(44, 45, 49, 0.9)',
                        titleColor: '#e9ecef',
                        bodyColor: '#e9ecef',
                        borderColor: '#404040',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6c757d'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(108, 117, 125, 0.1)'
                        },
                        ticks: {
                            color: '#6c757d',
                            precision: 0
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    updateVisitsChart(newData) {
        const maxDataPoints = 20;
        
        // Add new data point
        const timestamp = new Date().toLocaleTimeString();
        this.visitsChart.data.labels.push(timestamp);
        this.visitsChart.data.datasets[0].data.push(newData);

        // Remove old data points if we exceed maxDataPoints
        if (this.visitsChart.data.labels.length > maxDataPoints) {
            this.visitsChart.data.labels.shift();
            this.visitsChart.data.datasets[0].data.shift();
        }

        this.visitsChart.update('none'); // Update without animation for better performance
    }

    resetCharts() {
        this.visitsChart.data.labels = [];
        this.visitsChart.data.datasets[0].data = [];
        this.visitsChart.update();
    }
}

// Initialize analytics when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new Analytics();
});
