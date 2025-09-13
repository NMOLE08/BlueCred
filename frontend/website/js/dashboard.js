// Dashboard Integration Script
// This script connects the existing dashboard UI to real blockchain data

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏠 Dashboard integration starting...');
    
    // Initialize dashboard with real data
    await initializeDashboard();
    
    // Set up auto-refresh
    setInterval(updateDashboard, 30000); // Update every 30 seconds
});

async function initializeDashboard() {
    try {
        await updateDashboard();
        await updateRecentActivities();
        console.log('✅ Dashboard initialized with real data');
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        // Keep existing static data if API fails
    }
}

async function updateDashboard() {
    try {
        const stats = await window.BlueCred_API.getDashboardStats();
        
        // Update dashboard stats while preserving existing styling
        updateStatBox('TOTAL PROJECT', stats.totalProjects);
        updateStatBox('PENDING VERIFICATION', stats.pendingVerification, 'unblanced');
        updateStatBox('TOTAL BRCS ISSUED', window.BlueCred_Utils.formatNumber(stats.totalBRCSIssued));
        updateStatBox('ACTIVE FIELD USER', stats.activeFieldUsers);
        
        console.log('📊 Dashboard stats updated:', stats);
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

function updateStatBox(topicText, value, extraClass = '') {
    // Find the stat box by topic text
    const topicElements = document.querySelectorAll('.topic p');
    
    for (const topicElement of topicElements) {
        if (topicElement.textContent.trim() === topicText) {
            const countElement = topicElement.closest('.white_box, .blue_box').querySelector('.count p');
            if (countElement) {
                countElement.textContent = value;
                if (extraClass) {
                    countElement.className = extraClass;
                }
            }
            break;
        }
    }
}

async function updateRecentActivities() {
    try {
        const verificationQueue = await window.BlueCred_API.getVerificationQueue();
        const projects = await window.BlueCred_API.getProjects();
        
        // Generate recent activities from verification queue and projects
        const activities = [];
        
        // Add recent verification activities
        verificationQueue.slice(0, 2).forEach(item => {
            activities.push({
                message: `"${item.projectName || item.projectId} needs ${item.status === 'Pending' ? 'Urgent review' : 'attention'}"`,
                type: item.status === 'Pending' ? 'urgent' : 'normal'
            });
        });
        
        // Add project activities
        projects.slice(0, 2).forEach(project => {
            if (project.isVerified) {
                activities.push({
                    message: `"${project.name} verification completed"`,
                    type: 'normal'
                });
            }
        });
        
        // Update the alerts section
        updateAlertsSection(activities);
        
    } catch (error) {
        console.error('Error updating recent activities:', error);
    }
}

function updateAlertsSection(activities) {
    const alertsContainer = document.querySelector('.alerts');
    if (!alertsContainer) return;
    
    // Keep the header
    const header = alertsContainer.querySelector('h3');
    
    // Clear existing alerts except header
    const existingAlerts = alertsContainer.querySelectorAll('p');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new activities
    activities.forEach((activity, index) => {
        const alertElement = document.createElement('p');
        alertElement.className = index % 2 === 0 ? 'grey' : 'white';
        alertElement.textContent = activity.message;
        alertsContainer.appendChild(alertElement);
    });
    
    // If no activities, show default messages
    if (activities.length === 0) {
        const defaultAlerts = [
            { message: '"System running smoothly"', class: 'grey' },
            { message: '"All projects up to date"', class: 'white' }
        ];
        
        defaultAlerts.forEach(alert => {
            const alertElement = document.createElement('p');
            alertElement.className = alert.class;
            alertElement.textContent = alert.message;
            alertsContainer.appendChild(alertElement);
        });
    }
}

// Add refresh functionality to existing buttons
document.addEventListener('DOMContentLoaded', function() {
    // Add click handler to gear icon for manual refresh
    const gearButton = document.querySelector('.icons button:first-child');
    if (gearButton) {
        gearButton.addEventListener('click', async function() {
            console.log('🔄 Manual refresh triggered');
            
            // Show loading state
            const originalIcon = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            
            try {
                await window.BlueCred_API.refreshData();
                await updateDashboard();
                await updateRecentActivities();
                window.BlueCred_Utils.showSuccess('Dashboard refreshed successfully');
            } catch (error) {
                console.error('Refresh failed:', error);
                window.BlueCred_Utils.showError(null, 'Failed to refresh dashboard');
            } finally {
                // Restore original icon
                setTimeout(() => {
                    this.innerHTML = originalIcon;
                }, 1000);
            }
        });
    }
});

// Export functions for use in other scripts
window.DashboardIntegration = {
    updateDashboard,
    updateRecentActivities,
    initializeDashboard
};
