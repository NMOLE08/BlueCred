// BlueCred API Integration Layer
// This file connects the website frontend to the blockchain backend via API

class BlueCred_API {
    constructor() {
        this.baseURL = 'http://localhost:3002/api';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    // Generic API call method
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Get cached data or fetch from API
    async getCachedData(key, fetchFunction) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const data = await fetchFunction();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    // Dashboard Stats
    async getDashboardStats() {
        return this.getCachedData('dashboard-stats', () => 
            this.apiCall('/dashboard/stats')
        );
    }

    // Projects
    async getProjects() {
        return this.getCachedData('projects', () => 
            this.apiCall('/projects')
        );
    }

    async getProject(projectId) {
        return this.apiCall(`/projects/${projectId}`);
    }

    // Verification Queue
    async getVerificationQueue() {
        return this.getCachedData('verification-queue', () => 
            this.apiCall('/verification-queue')
        );
    }

    async updateVerificationStatus(submissionId, data) {
        return this.apiCall(`/verification/${submissionId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Marketplace
    async getMarketplaceListings() {
        return this.getCachedData('marketplace-listings', () => 
            this.apiCall('/marketplace/listings')
        );
    }

    // User data
    async getUserBalance(address) {
        return this.apiCall(`/users/${address}/balance`);
    }

    // Authentication
    async login(email, password) {
        return this.apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Refresh data
    async refreshData() {
        this.clearCache();
        // Pre-load commonly used data
        await Promise.all([
            this.getDashboardStats(),
            this.getProjects(),
            this.getVerificationQueue()
        ]);
    }
}

// Global API instance
window.BlueCred_API = new BlueCred_API();

// Auto-refresh data every 60 seconds
setInterval(() => {
    window.BlueCred_API.refreshData().catch(console.error);
}, 60000);

// Utility functions for the website
window.BlueCred_Utils = {
    // Format numbers with commas
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    },

    // Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    },

    // Format CO2e equivalent
    formatCO2e(nctAmount) {
        const co2e = parseFloat(nctAmount) * 3994;
        return this.formatNumber(Math.floor(co2e));
    },

    // Show loading state
    showLoading(element) {
        if (element) {
            element.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
        }
    },

    // Show error state
    showError(element, message = 'Error loading data') {
        if (element) {
            element.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${message}`;
        }
    },

    // Show success message
    showSuccess(message) {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Debounce function for search/filter
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

console.log('✅ BlueCred API integration loaded');
