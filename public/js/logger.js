class Logger {
    static container = document.getElementById('logContainer');
    static maxLogs = 1000;

    static log(type, message) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const icon = this.getIcon(type);
        
        entry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-icon">${icon}</span>
            <span class="log-message">${message}</span>
        `;

        this.container.appendChild(entry);
        this.container.scrollTop = this.container.scrollHeight;

        // Limit the number of log entries
        while (this.container.children.length > this.maxLogs) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    static getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            proxy: '<i class="fas fa-shield-alt"></i>'
        };
        return icons[type] || icons.info;
    }

    static clear() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    static filterLogs(type) {
        const entries = this.container.getElementsByClassName('log-entry');
        for (const entry of entries) {
            if (type === 'all' || entry.classList.contains(type)) {
                entry.style.display = 'block';
            } else {
                entry.style.display = 'none';
            }
        }
    }
}

// Initialize log filters
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Apply filter
            const filterType = e.target.dataset.filter;
            Logger.filterLogs(filterType);
        });
    });
});
