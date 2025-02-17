const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

class TrafficBot {
    constructor() {
        this.urls = new Set();
        this.proxies = [];
        this.isRunning = false;
        this.currentVisits = 0;
        this.targetVisits = 0;
        this.successfulVisits = 0;
        this.totalVisits = 0;
        this.startTime = null;
        this.minVisitTime = 30;
        this.maxVisitTime = 120;
        this.socket = null;
        this.currentProxyIndex = 0;
    }

    setSocket(socket) {
        this.socket = socket;
    }

    updateStats() {
        if (!this.socket) return;

        const stats = {
            currentVisits: this.currentVisits,
            targetVisits: this.targetVisits,
            successfulVisits: this.successfulVisits,
            totalVisits: this.totalVisits,
            successRate: this.totalVisits ? Math.round((this.successfulVisits / this.totalVisits) * 100) : 0,
            progress: this.targetVisits ? Math.round((this.currentVisits / this.targetVisits) * 100) : 0
        };

        this.socket.emit('statsUpdate', stats);
    }

    async start(config) {
        if (this.isRunning) return;

        try {
            // Validate and parse config
            if (!config.urls || !Array.isArray(config.urls) || config.urls.length === 0) {
                throw new Error('No URLs provided');
            }

            if (!config.targetVisits || isNaN(parseInt(config.targetVisits))) {
                throw new Error('Invalid target visits');
            }

            // Initialize bot state
            this.isRunning = true;
            this.currentVisits = 0;
            this.successfulVisits = 0;
            this.totalVisits = 0;
            this.targetVisits = parseInt(config.targetVisits);
            this.urls = new Set(config.urls.filter(url => this.isValidUrl(url)));
            this.proxies = config.proxies || [];
            this.minVisitTime = parseInt(config.minVisitTime) || 30;
            this.maxVisitTime = parseInt(config.maxVisitTime) || 120;
            this.startTime = Date.now();
            this.currentProxyIndex = 0;

            if (this.urls.size === 0) {
                throw new Error('No valid URLs provided');
            }

            console.log('Bot started with config:', {
                urls: Array.from(this.urls),
                targetVisits: this.targetVisits,
                minVisitTime: this.minVisitTime,
                maxVisitTime: this.maxVisitTime,
                useProxy: config.useProxy,
                proxyCount: this.proxies.length
            });

            this.socket?.emit('botStarted');

            // Start visiting URLs
            while (this.isRunning && this.currentVisits < this.targetVisits) {
                const urlArray = Array.from(this.urls);
                for (const url of urlArray) {
                    if (!this.isRunning || this.currentVisits >= this.targetVisits) break;

                    const proxy = this.proxies.length > 0 
                        ? this.proxies[this.currentProxyIndex % this.proxies.length] 
                        : null;

                    await this.visitUrl(url, proxy);

                    if (this.proxies.length > 0) {
                        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
                    }

                    if (this.isRunning && this.currentVisits < this.targetVisits) {
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 3000));
                    }
                }
            }
        } catch (error) {
            console.error('Error in bot start:', error);
            this.socket?.emit('visitError', { error: 'Bot start failed: ' + error.message });
        } finally {
            this.stop();
        }
    }

    async visitUrl(url, proxy = null) {
        let browser = null;
        try {
            console.log(`Visiting ${url}${proxy ? ' with proxy' : ''}`);
            
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    ...(proxy ? [`--proxy-server=${proxy}`] : [])
                ]
            });

            const page = await browser.newPage();
            
            // Set random user agent
            await page.setUserAgent(this.getRandomUserAgent());

            // Set viewport
            await page.setViewport({
                width: 1366 + Math.floor(Math.random() * 100),
                height: 768 + Math.floor(Math.random() * 100),
                deviceScaleFactor: 1
            });

            // Navigate to URL
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Simulate human behavior
            await this.simulateHumanBehavior(page);

            // Random visit duration
            const visitDuration = Math.floor(Math.random() * (this.maxVisitTime - this.minVisitTime + 1) + this.minVisitTime) * 1000;
            await new Promise(resolve => setTimeout(resolve, visitDuration));

            this.successfulVisits++;
            this.currentVisits++;
            this.totalVisits++;
            
            this.updateStats();
            this.socket?.emit('visitSuccess', { url, duration: visitDuration / 1000 });

            return true;
        } catch (error) {
            console.error(`Error visiting ${url}:`, error);
            this.totalVisits++;
            this.updateStats();
            this.socket?.emit('visitError', { url, error: error.message });
            return false;
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (error) {
                    console.error('Error closing browser:', error);
                }
            }
        }
    }

    async simulateHumanBehavior(page) {
        try {
            // Random scrolling
            const scrolls = Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < scrolls; i++) {
                await page.evaluate(() => {
                    window.scrollBy(0, (Math.random() * 500) - 250);
                });
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
            }

            // Random mouse movements
            const movements = Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < movements; i++) {
                const x = Math.floor(Math.random() * page.viewport().width);
                const y = Math.floor(Math.random() * page.viewport().height);
                await page.mouse.move(x, y);
                await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            }
        } catch (error) {
            console.error('Error in human behavior simulation:', error);
        }
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    stop() {
        this.isRunning = false;
        this.socket?.emit('botStopped');
    }

    reset() {
        this.urls = new Set();
        this.proxies = [];
        this.isRunning = false;
        this.currentVisits = 0;
        this.targetVisits = 0;
        this.successfulVisits = 0;
        this.totalVisits = 0;
        this.startTime = null;
        this.currentProxyIndex = 0;
        this.updateStats();
    }
}

const bot = new TrafficBot();

io.on('connection', (socket) => {
    console.log('Client connected');
    bot.setSocket(socket);

    socket.on('startBot', (config) => {
        bot.start(config);
    });

    socket.on('stopBot', () => {
        bot.stop();
    });

    socket.on('resetBot', () => {
        bot.reset();
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        if (socket === bot.socket) {
            bot.socket = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
