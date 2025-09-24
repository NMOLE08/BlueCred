// NCCR Verification API Integration
class VerificationAPI {
    constructor(baseUrl = 'http://127.0.0.1:5001/api') {
        this.baseUrl = baseUrl;
    }

    async fetchPendingProjects() {
        try {
            const response = await fetch(`${this.baseUrl}/verification/pending`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching pending projects:', error);
            throw error;
        }
    }

    async getProjectDetails(projectId) {
        try {
            const response = await fetch(`${this.baseUrl}/verification/project/${projectId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching project details:', error);
            throw error;
        }
    }

    async verifyProject(projectId, status, comments, approvedCarbonCredits) {
        try {
            const response = await fetch(`${this.baseUrl}/verification/project/${projectId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status,
                    comments,
                    approvedCarbonCredits,
                    verifierEmail: 'nccr@authority.gov'
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error verifying project:', error);
            throw error;
        }
    }

    async getVerificationStats() {
        try {
            const response = await fetch(`${this.baseUrl}/verification/stats`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching verification stats:', error);
            throw error;
        }
    }
}

// Initialize API
const verificationAPI = new VerificationAPI();

// DOM manipulation functions
function displayPendingProjects(projects) {
    const container = document.getElementById('pending-projects-container');
    if (!container) return;

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="no-projects">No pending projects found.</p>';
        return;
    }

    const projectsHTML = projects.map(project => `
        <div class="project-card" data-project-id="${project.projectId}">
            <div class="project-header">
                <h3>${project.projectName}</h3>
                <span class="status-badge status-${project.verificationStatus}">${project.verificationStatus.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="project-details">
                <p><strong>Project ID:</strong> ${project.projectId}</p>
                <p><strong>NGO:</strong> ${project.ngoId?.organizationName || 'Unknown'}</p>
                <p><strong>Type:</strong> ${project.projectType}</p>
                <p><strong>Location:</strong> ${project.projectLocation}</p>
                <p><strong>Carbon Credits:</strong> ${project.mlAnalysis?.carbonCreditsCalculated || 0} NCT</p>
                <p><strong>Confidence:</strong> ${((project.mlAnalysis?.confidenceScore || 0) * 100).toFixed(1)}%</p>
                <p><strong>Submitted:</strong> ${new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="viewProjectDetails('${project.projectId}')">View Details</button>
                <button class="btn btn-success" onclick="approveProject('${project.projectId}')">Approve</button>
                <button class="btn btn-danger" onclick="rejectProject('${project.projectId}')">Reject</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = projectsHTML;
}

function displayVerificationStats(stats) {
    const statsContainer = document.getElementById('verification-stats');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>${stats.pending}</h3>
            <p>Pending</p>
        </div>
        <div class="stat-card">
            <h3>${stats.under_review}</h3>
            <p>Under Review</p>
        </div>
        <div class="stat-card">
            <h3>${stats.approved}</h3>
            <p>Approved</p>
        </div>
        <div class="stat-card">
            <h3>${stats.rejected}</h3>
            <p>Rejected</p>
        </div>
        <div class="stat-card">
            <h3>${stats.totalProjects}</h3>
            <p>Total Projects</p>
        </div>
        <div class="stat-card">
            <h3>${stats.totalCarbonCredits}</h3>
            <p>Approved NCT</p>
        </div>
    `;
}

// Action functions
async function viewProjectDetails(projectId) {
    try {
        const response = await verificationAPI.getProjectDetails(projectId);
        if (response.success) {
            showProjectModal(response.data.project);
        } else {
            alert('Error loading project details: ' + response.message);
        }
    } catch (error) {
        alert('Error loading project details: ' + error.message);
    }
}

async function approveProject(projectId) {
    const comments = prompt('Enter approval comments (optional):');
    if (comments === null) return; // User cancelled

    try {
        const response = await verificationAPI.verifyProject(projectId, 'approved', comments);
        if (response.success) {
            alert('Project approved successfully!');
            loadPendingProjects(); // Refresh the list
        } else {
            alert('Error approving project: ' + response.message);
        }
    } catch (error) {
        alert('Error approving project: ' + error.message);
    }
}

async function rejectProject(projectId) {
    const comments = prompt('Enter rejection reason:');
    if (!comments) {
        alert('Rejection reason is required');
        return;
    }

    try {
        const response = await verificationAPI.verifyProject(projectId, 'rejected', comments);
        if (response.success) {
            alert('Project rejected successfully!');
            loadPendingProjects(); // Refresh the list
        } else {
            alert('Error rejecting project: ' + response.message);
        }
    } catch (error) {
        alert('Error rejecting project: ' + error.message);
    }
}

function showProjectModal(project) {
    // Create modal HTML
    const modalHTML = `
        <div id="project-modal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeProjectModal()">&times;</span>
                <h2>${project.projectName}</h2>
                <div class="project-full-details">
                    <p><strong>Project ID:</strong> ${project.projectId}</p>
                    <p><strong>Description:</strong> ${project.projectDescription}</p>
                    <p><strong>NGO:</strong> ${project.ngoId?.organizationName || 'Unknown'}</p>
                    <p><strong>Type:</strong> ${project.projectType}</p>
                    <p><strong>Location:</strong> ${project.projectLocation}</p>
                    <p><strong>Status:</strong> ${project.verificationStatus}</p>
                    <p><strong>Carbon Credits:</strong> ${project.mlAnalysis?.carbonCreditsCalculated || 0} NCT</p>
                    <p><strong>Confidence Score:</strong> ${((project.mlAnalysis?.confidenceScore || 0) * 100).toFixed(1)}%</p>
                    <p><strong>Model Version:</strong> ${project.mlAnalysis?.modelVersion || 'Unknown'}</p>
                    <p><strong>Analysis Date:</strong> ${project.mlAnalysis?.analysisDate ? new Date(project.mlAnalysis.analysisDate).toLocaleString() : 'Unknown'}</p>
                    <p><strong>Created:</strong> ${new Date(project.createdAt).toLocaleString()}</p>
                    ${project.verificationDetails?.comments ? `<p><strong>Comments:</strong> ${project.verificationDetails.comments}</p>` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="approveProject('${project.projectId}'); closeProjectModal();">Approve</button>
                    <button class="btn btn-danger" onclick="rejectProject('${project.projectId}'); closeProjectModal();">Reject</button>
                    <button class="btn btn-secondary" onclick="closeProjectModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('project-modal').style.display = 'block';
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.remove();
    }
}

// Load data functions
async function loadPendingProjects() {
    try {
        const response = await verificationAPI.fetchPendingProjects();
        if (response.success) {
            displayPendingProjects(response.data.projects);
        } else {
            console.error('Error loading pending projects:', response.message);
        }
    } catch (error) {
        console.error('Error loading pending projects:', error);
    }
}

async function loadVerificationStats() {
    try {
        const response = await verificationAPI.getVerificationStats();
        if (response.success) {
            displayVerificationStats(response.data);
        } else {
            console.error('Error loading verification stats:', response.message);
        }
    } catch (error) {
        console.error('Error loading verification stats:', error);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadPendingProjects();
    loadVerificationStats();
    
    // Refresh every 30 seconds
    setInterval(() => {
        loadPendingProjects();
        loadVerificationStats();
    }, 30000);
});
