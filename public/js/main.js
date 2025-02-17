class TrafficBotUI {
    constructor() {
        this.socket = io();
        this.state = {
            isRunning: false,
            currentVisits: 0,
            targetVisits: 0,
            successfulVisits: 0,
            totalVisits: 0
        };

        this.initializeElements();
        this.initializeSocketListeners();
        this.setupEventListeners();
    }

    initializeElements() {
        // URL Management
        this.urlList = document.getElementById('urlList');
        this.importUrls = document.getElementById('importUrls');
        this.clearUrls = document.getElementById('clearUrls');

        // Proxy Settings
        this.useProxy = document.getElementById('useProxy');
        this.proxyList = document.getElementById('proxyList');
        this.testProxies = document.getElementById('testProxies');
        this.clearProxies = document.getElementById('clearProxies');

        // Visit Time Settings
        this.minVisitTime = document.getElementById('minVisitTime');
        this.maxVisitTime = document.getElementById('maxVisitTime');

        // Traffic Goal
        this.targetInput = document.getElementById('targetInput');
        this.setGoalBtn = document.getElementById('setGoal');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');

        // Stats Elements
        this.totalUrls = document.getElementById('totalUrls');
        this.uniqueUrls = document.getElementById('uniqueUrls');
        this.totalVisits = document.getElementById('totalVisits');
        this.targetVisits = document.getElementById('targetVisits');
        this.successRate = document.getElementById('successRate');
        this.successfulVisits = document.getElementById('successfulVisits');
        this.avgTime = document.getElementById('avgTime');
        this.totalTime = document.getElementById('totalTime');

        // Controls
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Log Container
        this.logContainer = document.getElementById('logContainer');

        // Set initial state
        this.stopBtn.disabled = true;
        this.proxyList.disabled = !this.useProxy.checked;
    }

    setupEventListeners() {
        // URL Management
        this.importUrls.addEventListener('click', () => this.handleFileImport('url'));
        this.clearUrls.addEventListener('click', () => this.clearList('url'));

        // Proxy Settings
        this.useProxy.addEventListener('change', () => this.toggleProxyInputs());
        this.testProxies.addEventListener('click', () => this.testProxyList());
        this.clearProxies.addEventListener('click', () => this.clearList('proxy'));

        // Visit Time Settings
        this.minVisitTime.addEventListener('change', () => this.validateVisitTimes());
        this.maxVisitTime.addEventListener('change', () => this.validateVisitTimes());

        // Traffic Goal
        this.setGoalBtn.addEventListener('click', () => this.setGoal());

        // Bot Controls
        this.startBtn.addEventListener('click', () => this.startBot());
        this.stopBtn.addEventListener('click', () => this.stopBot());
        this.clearBtn.addEventListener('click', () => this.clearData());
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            this.addLogEntry('Connected to server', 'success');
            this.startBtn.disabled = false;
        });

        this.socket.on('disconnect', () => {
            this.addLogEntry('Disconnected from server', 'error');
            this.stopBot();
            this.startBtn.disabled = true;
        });

        this.socket.on('botStarted', () => {
            this.state.isRunning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.addLogEntry('Bot started', 'success');
        });

        this.socket.on('botStopped', () => {
            this.state.isRunning = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.addLogEntry('Bot stopped', 'info');
        });

        this.socket.on('visitSuccess', (data) => {
            this.addLogEntry(`Successfully visited ${data.url} (${data.duration}s)`, 'success');
        });

        this.socket.on('visitError', (data) => {
            this.addLogEntry(`Error visiting ${data.url}: ${data.error}`, 'error');
        });

        this.socket.on('statsUpdate', (stats) => {
            this.updateStats(stats);
        });
    }

    validateVisitTimes() {
        const min = parseInt(this.minVisitTime.value);
        const max = parseInt(this.maxVisitTime.value);
        
        if (min >= max) {
            this.maxVisitTime.value = min + 1;
        }
        
        if (min < 5) this.minVisitTime.value = 5;
        if (min > 300) this.minVisitTime.value = 300;
        if (max < 10) this.maxVisitTime.value = 10;
        if (max > 600) this.maxVisitTime.value = 600;
    }

    updateStats(stats) {
        this.state = { ...this.state, ...stats };
        
        // Update progress
        this.progressBar.style.width = `${stats.progress}%`;
        this.progressText.textContent = `${stats.currentVisits} / ${stats.targetVisits} visits`;
        this.progressPercent.textContent = `${stats.progress}%`;

        // Update stats display
        this.totalVisits.textContent = stats.totalVisits;
        this.targetVisits.textContent = stats.targetVisits;
        this.successfulVisits.textContent = stats.successfulVisits;
        this.successRate.textContent = `${stats.successRate}%`;

        // Update URL stats
        const uniqueUrls = new Set(this.urlList.value.split('\n').filter(url => url.trim())).size;
        this.totalUrls.textContent = this.urlList.value.split('\n').filter(url => url.trim()).length;
        this.uniqueUrls.textContent = uniqueUrls;
    }

    startBot() {
        if (this.urlList.value.trim() === '') {
            this.addLogEntry('Please add at least one URL', 'error');
            return;
        }

        if (!this.state.targetVisits) {
            this.addLogEntry('Please set a traffic goal', 'error');
            return;
        }

        const urls = this.urlList.value.trim().split('\n').filter(url => url.trim() !== '');
        const proxies = this.useProxy.checked ? this.proxyList.value.trim().split('\n').filter(proxy => proxy.trim() !== '') : [];
        
        if (this.useProxy.checked && proxies.length === 0) {
            this.addLogEntry('Please add proxies or disable proxy usage', 'error');
            return;
        }

        this.socket.emit('startBot', {
            urls,
            proxies,
            useProxy: this.useProxy.checked,
            targetVisits: this.state.targetVisits,
            minVisitTime: parseInt(this.minVisitTime.value),
            maxVisitTime: parseInt(this.maxVisitTime.value)
        });
    }

    stopBot() {
        this.socket.emit('stopBot');
    }

    clearData() {
        this.socket.emit('resetBot');
        this.urlList.value = '';
        this.proxyList.value = '';
        this.targetInput.value = '';
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '0 / 0 visits';
        this.progressPercent.textContent = '0%';
        this.updateStats({
            currentVisits: 0,
            targetVisits: 0,
            successfulVisits: 0,
            totalVisits: 0,
            successRate: 0,
            progress: 0
        });
        this.addLogEntry('Data cleared', 'info');
    }

    setGoal() {
        const target = parseInt(this.targetInput.value);
        if (isNaN(target) || target < 1) {
            this.addLogEntry('Please enter a valid target number of visits', 'error');
            return;
        }
        this.state.targetVisits = target;
        this.targetVisits.textContent = target;
        this.progressText.textContent = `0 / ${target} visits`;
        this.addLogEntry(`Traffic goal set to ${target} visits`, 'success');
    }

    toggleProxyInputs() {
        const isEnabled = this.useProxy.checked;
        this.proxyList.disabled = !isEnabled;
        this.testProxies.disabled = !isEnabled;
        this.clearProxies.disabled = !isEnabled;
    }

    addLogEntry(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
        
        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    async handleFileImport(type) {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                const text = await file.text();
                
                if (type === 'url') {
                    this.urlList.value = text;
                } else {
                    this.proxyList.value = text;
                }
                
                this.addLogEntry(`${type === 'url' ? 'URLs' : 'Proxies'} imported successfully`, 'success');
            };
            
            input.click();
        } catch (error) {
            this.addLogEntry(`Failed to import file: ${error.message}`, 'error');
        }
    }

    clearList(type) {
        if (type === 'url') {
            this.urlList.value = '';
            this.addLogEntry('URLs cleared', 'info');
        } else {
            this.proxyList.value = '';
            this.addLogEntry('Proxies cleared', 'info');
        }
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trafficBot = new TrafficBotUI();
});
