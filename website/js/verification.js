// Verification Page Integration Script
// This script connects the existing verification UI to real blockchain data

// Make functions globally available
window.initializeVerificationPage = initializeVerificationPage;
window.updateVerificationQueue = updateVerificationQueue;
window.applyFilters = applyFilters;

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔍 Verification page integration starting...');
    
    try {
        // Initialize verification page with real data
        await initializeVerificationPage();
        
        // Set up auto-refresh
        setInterval(updateVerificationQueue, 45000); // Update every 45 seconds
        
        console.log('✅ Verification page initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing verification page:', error);
    }
});

async function initializeVerificationPage() {
    try {
        await updateVerificationQueue();
        setupVerificationActions();
        console.log('✅ Verification page initialized with real data');
    } catch (error) {
        console.error('❌ Verification page initialization failed:', error);
        // Keep existing static data if API fails
    }
}

async function updateVerificationQueue() {
    console.log('🔄 Updating verification queue...');
    try {
        console.log('Fetching verification queue from API...');
        const verificationQueue = await window.BlueCred_API.getVerificationQueue();
        
        if (!verificationQueue) {
            throw new Error('No data received from API');
        }
        
        if (!Array.isArray(verificationQueue)) {
            console.error('Expected array but got:', typeof verificationQueue, verificationQueue);
            throw new Error('Invalid verification queue data format');
        }
        
        console.log(`📋 Received ${verificationQueue.length} projects from API`);
        
        // Store the verification queue data in the window object for easy access
        window.verificationQueueData = verificationQueue;
        
        // Update the table with the verification queue data
        updateVerificationTable(verificationQueue);
        
        // Re-apply any active filters
        if (window.applyFilters) {
            console.log('Applying filters...');
            applyFilters();
        } else {
            console.warn('applyFilters function not found');
        }
        
        return verificationQueue;
    } catch (error) {
        console.error('Error updating verification queue:', error);
        // Fallback to sample data if API fails
        const sampleData = [
            {
                id: 'proj-001',
                projectName: 'Sunderbans',
                location: 'West Bengal, India',
                organization: 'Sunderbans Conservation Society',
                status: 'Pending',
                submissionDate: new Date().toISOString(),
                area: 1250,
                estimatedCarbonSequestration: 2500,
                documents: []
            },
            {
                id: 'proj-002',
                projectName: 'SeaGrass Meadows',
                location: 'Tamil Nadu, India',
                organization: 'Marine Conservation Trust',
                status: 'In Review',
                submissionDate: new Date(Date.now() - 86400000).toISOString(),
                area: 850,
                estimatedCarbonSequestration: 1800,
                documents: []
            }
        ];
        window.verificationQueueData = sampleData;
        updateVerificationTable(sampleData);
    }
}

function updateVerificationTable(verificationData) {
    console.log('🔄 Updating verification table...');
    
    const tableBody = document.getElementById('verificationTableBody');
    if (!tableBody) {
        console.error('❌ Table body element not found');
        return;
    }
    
    console.log(`Rendering ${verificationData.length} projects in table`);
    
    try {
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add new rows from verification data
        if (verificationData && verificationData.length > 0) {
            verificationData.forEach((item, index) => {
                try {
                    const row = createVerificationRow(item);
                    if (row) {
                        tableBody.appendChild(row);
                        console.log(`✅ Added row for project: ${item.projectName || 'Unknown'}`);
                    }
                } catch (error) {
                    console.error(`❌ Error creating row for item ${index}:`, error);
                }
            });
            
            console.log(`✅ Updated table with ${verificationData.length} items`);
        } else {
            // Show no data message if no rows
            const noDataRow = document.createElement('tr');
            noDataRow.id = 'noDataRow';
            noDataRow.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                    <i class="fa-solid fa-inbox"></i> No verification items found
                </td>
            `;
            tableBody.appendChild(noDataRow);
            console.log('ℹ️ No verification data available');
        }
    } catch (error) {
        console.error('❌ Error updating verification table:', error);
        
        // Show error message
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error loading verification data
                </td>
            </tr>
        `;
    }
}

function createVerificationRow(item) {
    if (!item) return null;
    
    const row = document.createElement('tr');
    const status = item.status ? item.status.toLowerCase().replace(' ', '-') : '';
    row.setAttribute('data-status', status);
    row.setAttribute('data-id', item.id || '');
    
    // Format date
    const formattedDate = item.submissionDate ? new Date(item.submissionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : 'N/A';
    
    // Create row HTML without checkbox
    row.innerHTML = `
        <td>${item.id || 'N/A'}</td>
        <td>${item.location || 'N/A'}</td>
        <td>${item.organization || 'N/A'}</td>
        <td><span class="status status-${status}">${item.status || 'N/A'}</span></td>
        <td>${formattedDate}</td>
        <td>
            <button class="review-btn" data-id="${item.id || ''}">
                <i class="fas fa-eye"></i> Review
            </button>
        </td>
    `;
    
    return row;
}

function getStatusClass(status) {
    if (!status) return 'unknown';
    
    const statusLower = status.toLowerCase().trim();
    
    // Handle different status formats
    if (statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('review') || statusLower.includes('in review')) return 'in-review';
    if (statusLower.includes('approve')) return 'approved';
    if (statusLower.includes('reject')) return 'rejected';
    
    // Default case for unknown statuses
    return 'unknown';
}

// Initialize filters object
const filters = {
    status: '',
    projectType: '',
    submission: ''
};

// Apply filters to verification table
function applyFilters() {
    console.log('Applying filters...');
    
    // Get filter values from dropdowns
    const statusFilter = filters.status ? filters.status.toLowerCase() : '';
    const projectTypeFilter = filters.projectType ? filters.projectType.toLowerCase() : '';
    const submissionFilter = filters.submission ? filters.submission.toLowerCase() : '';
    
    const rows = document.querySelectorAll('#verificationTableBody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        if (row.id === 'noResults' || row.id === 'noDataRow') return;
        
        const status = (row.getAttribute('data-status') || '').toLowerCase();
        const projectId = (row.querySelector('td:first-child')?.textContent || '').toLowerCase();
        const location = (row.querySelector('td:nth-child(2)')?.textContent || '').toLowerCase();
        const organization = (row.querySelector('td:nth-child(3)')?.textContent || '').toLowerCase();
        const statusText = (row.querySelector('td:nth-child(4) .status')?.textContent || '').toLowerCase();
        const submissionDate = row.getAttribute('data-submission-date');
        
        // Check if row matches status filter
        const matchesStatus = !statusFilter || 
                            status.includes(statusFilter) || 
                            statusText.includes(statusFilter);
        
        // Check if row matches project type
        const matchesProjectType = !projectTypeFilter || 
                                 location.includes(projectTypeFilter) ||
                                 organization.includes(projectTypeFilter);
        
        // Check if row matches submission date filter
        const matchesSubmission = !submissionFilter || 
                               matchesSubmissionDate(submissionDate, submissionFilter);
        
        // Show/hide row based on filters
        if (matchesStatus && matchesProjectType && matchesSubmission) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide no results message
    const noResultsRow = document.getElementById('noResults');
    const tbody = document.getElementById('verificationTableBody');
    
    if (visibleCount === 0) {
        if (!noResultsRow) {
            const newRow = document.createElement('tr');
            newRow.id = 'noResults';
            newRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 20px;">
                    <i class="fas fa-inbox"></i> No matching projects found
                </td>
            `;
            tbody.appendChild(newRow);
        }
    } else if (noResultsRow) {
        noResultsRow.remove();
    }
    
    console.log(`Filter applied. Showing ${visibleCount} of ${rows.length} projects`);
}

// Helper function to check if a date matches the submission filter
function matchesSubmissionDate(dateString, filterType) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const now = new Date();
    
    switch(filterType.toLowerCase()) {
        case 'this week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return date >= weekStart;
            
        case 'this month':
            return date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
                   
        case 'this year':
            return date.getFullYear() === now.getFullYear();
            
        default:
            return true;
    }
}

// Initialize calendar
function initializeCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const monthYear = document.getElementById('monthYear');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    
    if (!calendarDays || !monthYear || !prevMonth || !nextMonth) {
        console.warn('Calendar elements not found');
        return;
    }
    
    let currentDate = new Date();
    
    function renderCalendar() {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        
        // Update month and year display
        monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
        
        // Clear previous calendar days
        calendarDays.innerHTML = '';
        
        // Add days from previous month
        for (let i = firstDay.getDay() - 1; i >= 0; i--) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = lastDayOfPrevMonth - i;
            calendarDays.appendChild(dayElement);
        }
        
        // Add days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = i;
            
            // Highlight today
            const today = new Date();
            if (i === today.getDate() && 
                currentDate.getMonth() === today.getMonth() && 
                currentDate.getFullYear() === today.getFullYear()) {
                dayElement.classList.add('today');
            }
            
            // Add click event for date selection
            dayElement.addEventListener('click', function() {
                // Remove selected class from all days
                document.querySelectorAll('.calendar-day').forEach(day => {
                    day.classList.remove('selected');
                });
                
                // Add selected class to clicked day
                this.classList.add('selected');
                
                // Handle date selection
                const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                console.log('Selected date:', selectedDate.toDateString());
                
                // Update filters and apply
                filters.submission = selectedDate.toISOString().split('T')[0];
                applyFilters();
            });
            
            calendarDays.appendChild(dayElement);
        }
        
        // Add days from next month to complete the grid
        const daysToAdd = 42 - calendarDays.children.length; // 6 rows x 7 days
        for (let i = 1; i <= daysToAdd; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = i;
            calendarDays.appendChild(dayElement);
        }
    }
    
    // Navigation event listeners
    prevMonth.addEventListener('click', function(e) {
        e.preventDefault();
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonth.addEventListener('click', function(e) {
        e.preventDefault();
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Initial render
    renderCalendar();
}

// Initialize dropdown event listeners
function initializeDropdowns() {
    // Status dropdown
    const statusDropdown = document.querySelector('.dropdown:first-child .dropdown-content');
    if (statusDropdown) {
        statusDropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const status = this.textContent.trim();
                filters.status = status === 'All' ? '' : status;
                document.querySelector('.dropdown:first-child .dropbtn span').innerHTML = 
                    `${status} <i class="fa-solid fa-angle-down"></i>`;
                applyFilters();
            });
        });
    }
    
    // Project Type dropdown
    const projectTypeDropdown = document.querySelectorAll('.dropdown')[1]?.querySelector('.dropdown-content');
    if (projectTypeDropdown) {
        projectTypeDropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const type = this.textContent.trim();
                filters.projectType = type === 'All' ? '' : type;
                document.querySelectorAll('.dropdown')[1].querySelector('.dropbtn span').innerHTML = 
                    `${type} <i class="fa-solid fa-angle-down"></i>`;
                applyFilters();
            });
        });
    }
    
    // Submission dropdown
    const submissionDropdown = document.querySelectorAll('.dropdown')[2]?.querySelector('.dropdown-content');
    if (submissionDropdown) {
        submissionDropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const submission = this.textContent.trim();
                filters.submission = submission === 'All' ? '' : submission;
                document.querySelectorAll('.dropdown')[2].querySelector('.dropbtn span').innerHTML = 
                    `${submission} <i class="fa-solid fa-angle-down"></i>`;
                applyFilters();
            });
        });
    }
}

function setupVerificationActions() {
    console.log('Setting up verification actions...');
    
    // Initialize dropdowns
    initializeDropdowns();
    
    // Initialize calendar
    initializeCalendar();
    
    // Handle review button clicks using event delegation
    document.addEventListener('click', function(e) {
        const reviewBtn = e.target.closest('.review-btn');
        if (reviewBtn) {
            e.preventDefault();
            const projectId = reviewBtn.getAttribute('data-id');
            if (projectId) {
                // Find the project in the verification queue
                const project = window.verificationQueueData?.find(p => p.id === projectId);
                if (project) {
                    // Store project data in session storage
                    sessionStorage.setItem('currentProject', JSON.stringify(project));
                    console.log('Navigating to report for project:', projectId);
                    // Navigate to report page
                    window.location.href = 'report.html';
                } else {
                    console.error('Project not found:', projectId);
                    alert('Error: Project details not found. Please try again.');
                }
            }
        }
    });
    
    // Add event listeners for status filter dropdown
    const statusDropdown = document.querySelector('.status-dropdown .dropdown-content');
    if (statusDropdown) {
        statusDropdown.addEventListener('click', function(e) {
            const statusItem = e.target.closest('a');
            if (statusItem) {
                e.preventDefault();
                const status = statusItem.getAttribute('data-value') || '';
                filters.status = status === 'all' ? null : status;
                applyFilters();
            }
        });
    }
    
    // Add event listener for search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Debounce the search to avoid too many re-renders
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }
    
    console.log('Verification actions setup complete');
}

function addBulkActionsToolbar() {
    const container = document.querySelector('.container1');
    if (!container || container.querySelector('.bulk-actions')) return;
    
    const bulkActionsDiv = document.createElement('div');
    bulkActionsDiv.className = 'bulk-actions';
    bulkActionsDiv.style.cssText = `
        display: none;
        background: #f8f9fa;
        padding: 10px;
        border-radius: 5px;
        margin: 10px 0;
        border-left: 4px solid #005AC6;
    `;
    
    bulkActionsDiv.innerHTML = `
        <span style="margin-right: 15px; font-weight: 500;">
            <i class="fa-solid fa-check-square"></i> 
            <span class="selected-count">0</span> items selected
        </span>
        <button class="bulk-approve-btn" style="margin-right: 10px; padding: 5px 15px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">
            <i class="fa-solid fa-check"></i> Approve Selected
        </button>
        <button class="bulk-reject-btn" style="padding: 5px 15px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">
            <i class="fa-solid fa-times"></i> Reject Selected
        </button>
    `;
    
    container.appendChild(bulkActionsDiv);
    
    // Add event listeners for bulk actions
    bulkActionsDiv.querySelector('.bulk-approve-btn').addEventListener('click', () => {
        performBulkAction('approved');
    });
    
    bulkActionsDiv.querySelector('.bulk-reject-btn').addEventListener('click', () => {
        performBulkAction('rejected');
    });
}

function updateBulkActionsVisibility() {
    const selectedCheckboxes = document.querySelectorAll('table tbody input[type="checkbox"]:checked');
    const bulkActions = document.querySelector('.bulk-actions');
    const selectedCount = bulkActions?.querySelector('.selected-count');
    
    if (bulkActions && selectedCount) {
        selectedCount.textContent = selectedCheckboxes.length;
        bulkActions.style.display = selectedCheckboxes.length > 0 ? 'block' : 'none';
    }
}

async function performBulkAction(action) {
    const selectedCheckboxes = document.querySelectorAll('table tbody input[type="checkbox"]:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(checkbox => {
        return checkbox.closest('tr').getAttribute('data-submission-id');
    }).filter(id => id);
    
    if (selectedIds.length === 0) {
        window.BlueCred_Utils.showError(null, 'No items selected');
        return;
    }
    
    const confirmMessage = `Are you sure you want to ${action} ${selectedIds.length} selected items?`;
    if (!confirm(confirmMessage)) return;
    
    try {
        // Show loading state
        const bulkActions = document.querySelector('.bulk-actions');
        const originalContent = bulkActions.innerHTML;
        bulkActions.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        
        // Process each selected item
        const results = await Promise.allSettled(
            selectedIds.map(id => 
                window.BlueCred_API.updateVerificationStatus(id, { status: action })
            )
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (successful > 0) {
            window.BlueCred_Utils.showSuccess(`${successful} items ${action} successfully`);
            await updateVerificationQueue(); // Refresh the table
        }
        
        if (failed > 0) {
            window.BlueCred_Utils.showError(null, `${failed} items failed to update`);
        }
        
        // Restore bulk actions toolbar
        bulkActions.innerHTML = originalContent;
        
        // Clear selections
        document.querySelectorAll('table input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        updateBulkActionsVisibility();
        
    } catch (error) {
        console.error('Bulk action failed:', error);
        window.BlueCred_Utils.showError(null, 'Bulk action failed');
    }
}

// Enhanced filtering with real data
function enhanceFiltering() {
    const originalApplyFilters = window.applyFilters;
    
    window.applyFilters = function() {
        // Call original filtering logic
        if (originalApplyFilters) {
            originalApplyFilters();
        }
        
        // Add additional filtering based on real data
        const rows = document.querySelectorAll('table tbody tr[data-status]');
        let visibleCount = 0;
        
        rows.forEach(row => {
            if (row.style.display !== 'none') {
                visibleCount++;
            }
        });
        
        // Update filter results count
        updateFilterResultsCount(visibleCount);
    };
}

function updateFilterResultsCount(count) {
    let resultsCounter = document.querySelector('.filter-results-count');
    
    if (!resultsCounter) {
        resultsCounter = document.createElement('div');
        resultsCounter.className = 'filter-results-count';
        resultsCounter.style.cssText = `
            margin: 10px 0;
            font-size: 14px;
            color: #666;
            font-weight: 500;
        `;
        
        const container = document.querySelector('.container1');
        if (container) {
            container.appendChild(resultsCounter);
        }
    }
    
    resultsCounter.innerHTML = `
        <i class="fa-solid fa-filter"></i> 
        Showing ${count} verification ${count === 1 ? 'item' : 'items'}
    `;
}

// Initialize enhanced features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the original scripts to load
    setTimeout(() => {
        enhanceFiltering();
    }, 1000);
});

// Export functions for use in other scripts
window.VerificationIntegration = {
    updateVerificationQueue,
    reviewSubmission: window.reviewSubmission,
    performBulkAction
};
