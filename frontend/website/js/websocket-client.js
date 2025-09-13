// WebSocket Client for Real-time Updates
// This handles real-time communication between all BlueCred components

class BlueCred_WebSocket {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.eventListeners = new Map();
        
        this.connect();
    }

    connect() {
        try {
            // Use WebSocket server (would need to be implemented)
            this.ws = new WebSocket('ws://localhost:3003');
            
            this.ws.onopen = () => {
                console.log('🔗 WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                
                // Subscribe to relevant channels
                this.subscribe(['projects', 'verification', 'dashboard']);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
                this.emit('disconnected');
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
        }
    }

    subscribe(channels) {
        if (this.isConnected && Array.isArray(channels)) {
            this.send({
                type: 'subscribe',
                channels: channels
            });
        }
    }

    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, message queued');
            // In a real implementation, you might queue messages
        }
    }

    handleMessage(data) {
        const { type, channel, payload } = data;
        
        switch (type) {
            case 'update':
                this.handleUpdate(channel, payload);
                break;
            case 'notification':
                this.handleNotification(payload);
                break;
            case 'error':
                this.handleError(payload);
                break;
            default:
                console.log('Unknown message type:', type);
        }
        
        // Emit to registered listeners
        this.emit(type, { channel, payload });
    }

    handleUpdate(channel, payload) {
        switch (channel) {
            case 'projects':
                this.handleProjectUpdate(payload);
                break;
            case 'verification':
                this.handleVerificationUpdate(payload);
                break;
            case 'dashboard':
                this.handleDashboardUpdate(payload);
                break;
        }
    }

    handleProjectUpdate(payload) {
        console.log('📊 Project update received:', payload);
        
        // Update project data in cache
        if (window.BlueCred_API) {
            window.BlueCred_API.clearCache();
        }
        
        // Refresh dashboard if on homepage
        if (window.DashboardIntegration && typeof window.DashboardIntegration.updateDashboard === 'function') {
            window.DashboardIntegration.updateDashboard();
        }
        
        // Show notification
        this.showUpdateNotification('Project Updated', `${payload.projectName || 'A project'} has been updated`);
    }

    handleVerificationUpdate(payload) {
        console.log('✅ Verification update received:', payload);
        
        // Update verification queue if on verification page
        if (window.VerificationIntegration && typeof window.VerificationIntegration.updateVerificationQueue === 'function') {
            window.VerificationIntegration.updateVerificationQueue();
        }
        
        // Show notification
        this.showUpdateNotification('Verification Update', `Verification status changed to ${payload.status}`);
    }

    handleDashboardUpdate(payload) {
        console.log('📈 Dashboard update received:', payload);
        
        // Update dashboard stats
        if (window.DashboardIntegration && typeof window.DashboardIntegration.updateDashboard === 'function') {
            window.DashboardIntegration.updateDashboard();
        }
    }

    handleNotification(payload) {
        console.log('🔔 Notification received:', payload);
        this.showNotification(payload.title, payload.message, payload.type);
    }

    handleError(payload) {
        console.error('❌ WebSocket error:', payload);
        this.showNotification('Error', payload.message, 'error');
    }

    showUpdateNotification(title, message) {
        // Create update notification
        const notification = document.createElement('div');
        notification.className = 'realtime-notification update';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🔄</div>
                <div class="notification-text">
                    <strong>${title}</strong>
                    <p>${message}</p>
                </div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        this.addNotificationStyles(notification);
        this.showNotificationElement(notification);
    }

    showNotification(title, message, type = 'info') {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        const notification = document.createElement('div');
        notification.className = `realtime-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icons[type] || icons.info}</div>
                <div class="notification-text">
                    <strong>${title}</strong>
                    <p>${message}</p>
                </div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        this.addNotificationStyles(notification);
        this.showNotificationElement(notification);
    }

    addNotificationStyles(notification) {
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid #005AC6;
            z-index: 10000;
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add CSS animation if not already added
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .realtime-notification .notification-content {
                    display: flex;
                    align-items: flex-start;
                    padding: 15px;
                    gap: 12px;
                }
                .realtime-notification .notification-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }
                .realtime-notification .notification-text {
                    flex: 1;
                }
                .realtime-notification .notification-text strong {
                    display: block;
                    color: #333;
                    margin-bottom: 4px;
                }
                .realtime-notification .notification-text p {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                }
                .realtime-notification .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .realtime-notification .notification-close:hover {
                    color: #333;
                }
                .realtime-notification.error {
                    border-left-color: #f44336;
                }
                .realtime-notification.success {
                    border-left-color: #4CAF50;
                }
                .realtime-notification.warning {
                    border-left-color: #FF9800;
                }
            `;
            document.head.appendChild(style);
        }
    }

    showNotificationElement(notification) {
        document.body.appendChild(notification);
        
        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.removeNotification(notification);
            }
        }, 5000);
    }

    removeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    // Simulate real-time updates for demo purposes
    startDemoUpdates() {
        console.log('🎭 Starting demo real-time updates...');
        
        // Simulate project updates every 30 seconds
        setInterval(() => {
            this.handleMessage({
                type: 'update',
                channel: 'projects',
                payload: {
                    projectId: 'demo_project',
                    projectName: 'Demo Project',
                    action: 'data_added'
                }
            });
        }, 30000);
        
        // Simulate verification updates every 45 seconds
        setInterval(() => {
            this.handleMessage({
                type: 'update',
                channel: 'verification',
                payload: {
                    submissionId: 'demo_submission',
                    status: 'Approved',
                    action: 'status_changed'
                }
            });
        }, 45000);
        
        // Simulate dashboard updates every 60 seconds
        setInterval(() => {
            this.handleMessage({
                type: 'update',
                channel: 'dashboard',
                payload: {
                    metric: 'totalProjects',
                    value: Math.floor(Math.random() * 100) + 3000,
                    action: 'stats_updated'
                }
            });
        }, 60000);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Initialize WebSocket connection
window.BlueCred_WebSocket = new BlueCred_WebSocket();

// Start demo updates if no real WebSocket server is available
setTimeout(() => {
    if (!window.BlueCred_WebSocket.isConnected) {
        console.log('🎭 No WebSocket server detected, starting demo mode');
        window.BlueCred_WebSocket.startDemoUpdates();
    }
}, 3000);

console.log('🔗 WebSocket client initialized');
