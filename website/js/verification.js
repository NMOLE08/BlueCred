// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables for filtering
let allProjects = [];
let filteredProjects = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeDropdowns();
    initializeCalendar();
    loadProjects();
});

// Load projects from API
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        const result = await response.json();
        
        if (response.ok) {
            allProjects = result;
            filteredProjects = [...allProjects];
            updateTable();
        } else {
            console.error('Failed to load projects:', result.error);
            showError('Failed to load project data');
        }
    } catch (error) {
        console.error('Network error:', error);
        showError('Network error. Please check if the backend server is running.');
    }
}

// Update the verification table with current data
function updateTable() {
    const tableBody = document.querySelector('table');
    
    // Clear existing rows except header
    const rows = tableBody.querySelectorAll('tr');
    for (let i = 1; i < rows.length; i++) {
        rows[i].remove();
    }
    
    // Add new rows
    filteredProjects.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.projectName || project.projectId}</td>
            <td>${project.location}</td>
            <td>${project.organization}</td>
            <td>${project.status}</td>
            <td><button onclick="reviewProject('${project._id}')">Review</button></td>
        `;
        tableBody.appendChild(row);
    });
    
    // Show message if no data
    if (filteredProjects.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                No projects found matching the current filters
            </td>
        `;
        tableBody.appendChild(row);
    }
}

// Filter projects based on current filter settings
function applyFilters() {
    const statusFilter = getSelectedFilter('Status');
    const projectTypeFilter = getSelectedFilter('Project Type');
    const submissionFilter = getSelectedFilter('Submission');
    const selectedDate = getSelectedDate();
    
    filteredProjects = allProjects.filter(project => {
        // Status filter
        if (statusFilter && statusFilter !== 'Status' && project.status !== statusFilter) {
            return false;
        }
        
        // Project type filter (using dataType)
        if (projectTypeFilter && projectTypeFilter !== 'Project Type' && project.dataType !== projectTypeFilter) {
            return false;
        }
        
        // Date filter
        if (selectedDate) {
            const projectDate = new Date(project.submissionDate);
            const filterDate = new Date(selectedDate);
            if (projectDate.toDateString() !== filterDate.toDateString()) {
                return false;
            }
        }
        
        return true;
    });
    
    updateTable();
}

// Get selected filter value
function getSelectedFilter(filterName) {
    const dropdowns = document.querySelectorAll('.dropdown');
    for (let dropdown of dropdowns) {
        const button = dropdown.querySelector('.dropbtn');
        if (button.textContent.includes(filterName)) {
            const text = button.textContent.trim();
            return text.includes('↓') ? text.replace('↓', '').trim() : text;
        }
    }
    return null;
}

// Get selected date from calendar
function getSelectedDate() {
    const selectedDay = document.querySelector('.calendar-day.selected');
    if (selectedDay && window.calendarInstance) {
        return window.calendarInstance.selectedDate;
    }
    return null;
}

// Review project function
async function reviewProject(projectId) {
    try {
        const project = allProjects.find(p => p._id === projectId);
        if (!project) {
            showError('Project not found');
            return;
        }
        
        // Create modal or detailed view
        showProjectDetails(project);
    } catch (error) {
        console.error('Error reviewing project:', error);
        showError('Failed to load project details');
    }
}

// Show project details in a modal
function showProjectDetails(project) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Project Details</h2>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="project-info">
                    <h3>General Information</h3>
                    <p><strong>Project Name:</strong> ${project.projectName}</p>
                    <p><strong>Project ID:</strong> ${project.projectId}</p>
                    <p><strong>Location:</strong> ${project.location}</p>
                    <p><strong>Organization:</strong> ${project.organization}</p>
                    <p><strong>Data Type:</strong> ${project.dataType}</p>
                    <p><strong>Submission Date:</strong> ${new Date(project.submissionDate).toLocaleDateString()}</p>
                </div>
                
                <div class="observation-data">
                    <h3>Observation Data</h3>
                    <p><strong>Health Status:</strong> ${project.healthStatus}</p>
                    <p><strong>Saplings Planted:</strong> ${project.saplingsPlanted}</p>
                    <p><strong>Average Sapling Height:</strong> ${project.avgSaplingHeight} cm</p>
                </div>
                
                <div class="status-section">
                    <h3>Verification Status</h3>
                    <p><strong>Current Status:</strong> ${project.status}</p>
                    <div class="status-buttons">
                        <button onclick="updateProjectStatus('${project._id}', 'Approved')" class="approve-btn">Approve</button>
                        <button onclick="updateProjectStatus('${project._id}', 'Rejected')" class="reject-btn">Reject</button>
                        <button onclick="updateProjectStatus('${project._id}', 'In Review')" class="review-btn">Mark In Review</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            display: block;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border-radius: 10px;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .close {
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover {
            color: #f00;
        }
        .project-info, .observation-data, .status-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .status-buttons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .status-buttons button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }
        .approve-btn { background-color: #28a745; color: white; }
        .reject-btn { background-color: #dc3545; color: white; }
        .review-btn { background-color: #007bff; color: white; }
        .status-buttons button:hover {
            opacity: 0.8;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Update project status
async function updateProjectStatus(projectId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update local data
            const projectIndex = allProjects.findIndex(p => p._id === projectId);
            if (projectIndex !== -1) {
                allProjects[projectIndex].status = newStatus;
            }
            
            // Refresh filtered data and table
            applyFilters();
            closeModal();
            showSuccess(`Project status updated to ${newStatus}`);
        } else {
            showError(`Failed to update status: ${result.error}`);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Network error while updating status');
    }
}

// Initialize dropdown functionality
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const dropbtn = dropdown.querySelector('.dropbtn');
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        
        dropbtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close all other dropdowns
            dropdowns.forEach(otherDropdown => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('active');
        });
        
        // Handle dropdown item selection
        const dropdownItems = dropdownContent.querySelectorAll('a');
        dropdownItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const originalText = dropbtn.textContent;
                const iconMatch = originalText.match(/<.*>/);
                const icon = iconMatch ? iconMatch[0] : '';
                
                dropbtn.innerHTML = this.textContent + ' <span><i class="fa-solid fa-angle-down"></i></span>';
                dropdown.classList.remove('active');
                
                // Apply filters when selection changes
                setTimeout(applyFilters, 100);
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    });
}

// Initialize calendar with filter integration
function initializeCalendar() {
    // Extend the existing calendar to trigger filtering
    const originalSelectDate = window.Calendar ? window.Calendar.prototype.selectDate : null;
    
    if (originalSelectDate) {
        window.Calendar.prototype.selectDate = function(date) {
            originalSelectDate.call(this, date);
            // Apply filters when date is selected
            setTimeout(applyFilters, 100);
        };
    }
}

// Utility functions
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #dc3545;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1001;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1001;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
