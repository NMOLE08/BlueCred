// Report Page Integration Script
// This script connects the existing report UI to real blockchain data for detailed project reviews

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Report page integration starting...');
    
    // Initialize report page with submission data
    await initializeReportPage();
});

async function initializeReportPage() {
    try {
        // Get submission data from localStorage (passed from verification page)
        const submissionData = getSubmissionData();
        
        if (submissionData) {
            await loadProjectDetails(submissionData);
            setupVerificationForm(submissionData);
        } else {
            // Load default/sample data if no specific submission
            await loadDefaultProjectData();
        }
        
        console.log('✅ Report page initialized with project data');
    } catch (error) {
        console.error('❌ Report page initialization failed:', error);
        showErrorState();
    }
}

function getSubmissionData() {
    try {
        const stored = localStorage.getItem('currentSubmission');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error parsing submission data:', error);
        return null;
    }
}

async function loadProjectDetails(submissionData) {
    try {
        // Get detailed project data
        const projectData = submissionData.data || await window.BlueCred_API.getProject(submissionData.projectId);
        
        // Update Project Details section
        updateProjectDetailsSection(projectData);
        
        // Update Estimations section
        updateEstimationsSection(projectData);
        
    } catch (error) {
        console.error('Error loading project details:', error);
        showErrorState();
    }
}

function updateProjectDetailsSection(projectData) {
    const projectDetailsBox = document.querySelector('.container1 .box:first-of-type');
    if (!projectDetailsBox) return;
    
    const details = {
        'Project ID': projectData.id || 'N/A',
        'Project Name': projectData.name || 'Unnamed Project',
        'Location': projectData.location || 'Not specified',
        'Project Type': projectData.projectType || 'Blue Carbon',
        'Area (hectares)': projectData.area ? `${projectData.area} ha` : 'Not specified',
        'Submission Date': projectData.submissionDate ? window.BlueCred_Utils.formatDate(projectData.submissionDate) : 'N/A',
        'Field Data Points': projectData.dataPoints ? projectData.dataPoints.length : '0',
        'Images Submitted': projectData.images ? projectData.images.length : '0',
        'Current Status': projectData.status || 'Under Review'
    };
    
    let detailsHTML = '<div class="project-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px;">';
    
    Object.entries(details).forEach(([key, value]) => {
        detailsHTML += `
            <div class="detail-item" style="display: flex; flex-direction: column; gap: 5px;">
                <strong style="color: #005AC6; font-size: 14px;">${key}:</strong>
                <span style="color: #333; font-size: 16px;">${value}</span>
            </div>
        `;
    });
    
    detailsHTML += '</div>';
    
    // Add media gallery if images exist
    if (projectData.images && projectData.images.length > 0) {
        detailsHTML += `
            <div class="media-gallery" style="margin-top: 20px; padding: 20px; border-top: 1px solid #eee;">
                <h4 style="color: #005AC6; margin-bottom: 15px;">
                    <i class="fa-solid fa-images"></i> Submitted Media (${projectData.images.length})
                </h4>
                <div class="image-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                    ${projectData.images.map((img, index) => `
                        <div class="image-item" style="position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1;">
                            <img src="${img.url || 'assets/placeholder.jpg'}" alt="Field Image ${index + 1}" 
                                 style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                                 onclick="openImageModal('${img.url || 'assets/placeholder.jpg'}', '${img.description || 'Field Image'}')">
                            <div class="image-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; padding: 10px; font-size: 12px;">
                                ${img.description || `Image ${index + 1}`}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    projectDetailsBox.innerHTML = detailsHTML;
}

function updateEstimationsSection(projectData) {
    const estimationsBox = document.querySelector('.container1 .box:last-of-type');
    if (!estimationsBox) return;
    
    // Calculate estimations based on project data
    const estimatedCO2e = projectData.area ? Math.floor(projectData.area * 12.5) : 0; // Rough estimate: 12.5 tons CO2e per hectare
    const estimatedNCT = estimatedCO2e ? Math.floor(estimatedCO2e / 3994) : 0; // Convert to NCT tokens
    const estimatedValue = estimatedNCT * 0.0002504; // ETH value
    
    const estimations = {
        'Estimated CO₂e Sequestration': `${window.BlueCred_Utils.formatNumber(estimatedCO2e)} tons`,
        'Potential NCT Tokens': `${window.BlueCred_Utils.formatNumber(estimatedNCT)} NCT`,
        'Estimated Market Value': `${estimatedValue.toFixed(6)} ETH`,
        'Verification Confidence': projectData.verificationScore ? `${projectData.verificationScore}%` : 'Pending',
        'Data Quality Score': calculateDataQualityScore(projectData),
        'Compliance Status': projectData.isCompliant ? 'Compliant' : 'Under Review'
    };
    
    let estimationsHTML = '<div class="estimations-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px;">';
    
    Object.entries(estimations).forEach(([key, value]) => {
        const isPositive = key.includes('Confidence') || key.includes('Quality') || key.includes('Compliant');
        const valueColor = isPositive && value.includes('%') ? '#4CAF50' : '#333';
        
        estimationsHTML += `
            <div class="estimation-item" style="display: flex; flex-direction: column; gap: 5px;">
                <strong style="color: #005AC6; font-size: 14px;">${key}:</strong>
                <span style="color: ${valueColor}; font-size: 16px; font-weight: 500;">${value}</span>
            </div>
        `;
    });
    
    estimationsHTML += '</div>';
    
    // Add progress indicators
    estimationsHTML += `
        <div class="progress-indicators" style="margin-top: 20px; padding: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #005AC6; margin-bottom: 15px;">
                <i class="fa-solid fa-chart-line"></i> Verification Progress
            </h4>
            ${createProgressBar('Data Collection', projectData.dataCollectionProgress || 85)}
            ${createProgressBar('Image Analysis', projectData.imageAnalysisProgress || 70)}
            ${createProgressBar('Field Verification', projectData.fieldVerificationProgress || 45)}
        </div>
    `;
    
    estimationsBox.innerHTML = estimationsHTML;
}

function calculateDataQualityScore(projectData) {
    let score = 0;
    let maxScore = 0;
    
    // Check various data quality factors
    if (projectData.images && projectData.images.length > 0) {
        score += Math.min(projectData.images.length * 10, 30);
        maxScore += 30;
    }
    
    if (projectData.dataPoints && projectData.dataPoints.length > 0) {
        score += Math.min(projectData.dataPoints.length * 5, 25);
        maxScore += 25;
    }
    
    if (projectData.location) {
        score += 15;
        maxScore += 15;
    }
    
    if (projectData.area && projectData.area > 0) {
        score += 15;
        maxScore += 15;
    }
    
    if (projectData.description && projectData.description.length > 50) {
        score += 15;
        maxScore += 15;
    }
    
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return `${percentage}%`;
}

function createProgressBar(label, percentage) {
    const color = percentage >= 80 ? '#4CAF50' : percentage >= 60 ? '#FF9800' : '#f44336';
    
    return `
        <div class="progress-item" style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-size: 14px; color: #666;">${label}</span>
                <span style="font-size: 14px; font-weight: 500; color: ${color};">${percentage}%</span>
            </div>
            <div style="background: #f0f0f0; border-radius: 10px; height: 8px; overflow: hidden;">
                <div style="background: ${color}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
            </div>
        </div>
    `;
}

function setupVerificationForm(submissionData) {
    // Enhanced dropdown functionality with real data
    enhanceDropdownFunctionality();
    
    // Setup final verification button
    setupFinalVerificationButton(submissionData);
    
    // Add auto-save functionality
    setupAutoSave();
    
    // Pre-fill BCRs calculation
    calculateAndFillBCRs(submissionData);
}

function enhanceDropdownFunctionality() {
    const dropdown = document.querySelector('.dropdown');
    const dropbtn = dropdown?.querySelector('.dropbtn');
    const dropdownItems = dropdown?.querySelectorAll('.dropdown-content a');
    
    if (!dropdown || !dropbtn || !dropdownItems) return;
    
    // Store selected outcome
    let selectedOutcome = null;
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            selectedOutcome = this.textContent.trim();
            
            // Update button text with icon
            const icon = getOutcomeIcon(selectedOutcome);
            dropbtn.innerHTML = `${icon} ${selectedOutcome} <span><i class="fa-solid fa-angle-down"></i></span>`;
            
            // Store selection
            dropbtn.setAttribute('data-selected', selectedOutcome);
            
            // Update form based on selection
            updateFormBasedOnOutcome(selectedOutcome);
            
            dropdown.classList.remove('active');
        });
    });
}

function getOutcomeIcon(outcome) {
    switch (outcome.toLowerCase()) {
        case 'approved':
            return '<i class="fa-solid fa-check-circle" style="color: #4CAF50;"></i>';
        case 'rejected':
            return '<i class="fa-solid fa-times-circle" style="color: #f44336;"></i>';
        case 'in review':
            return '<i class="fa-solid fa-clock" style="color: #FF9800;"></i>';
        case 'send back for reupload':
            return '<i class="fa-solid fa-upload" style="color: #2196F3;"></i>';
        default:
            return '<i class="fa-solid fa-question-circle"></i>';
    }
}

function updateFormBasedOnOutcome(outcome) {
    const bcrInput = document.querySelector('input[placeholder="BCRs To Issue"]');
    const commentInput = document.querySelector('input[placeholder="NCCR Reviewer Comment"]');
    
    if (outcome.toLowerCase() === 'rejected') {
        if (bcrInput) bcrInput.value = '0';
        if (commentInput) commentInput.placeholder = 'Please provide reason for rejection...';
    } else if (outcome.toLowerCase() === 'approved') {
        if (commentInput) commentInput.placeholder = 'Approval notes (optional)...';
    }
}

function setupFinalVerificationButton(submissionData) {
    const finalButton = document.getElementById('button');
    if (!finalButton) return;
    
    finalButton.addEventListener('click', async function() {
        await handleFinalVerification(submissionData);
    });
}

async function handleFinalVerification(submissionData) {
    try {
        // Collect form data
        const formData = collectFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        // Show loading state
        const button = document.getElementById('button');
        const originalText = button.value;
        button.value = 'Processing...';
        button.disabled = true;
        
        // Submit verification
        const result = await window.BlueCred_API.updateVerificationStatus(
            submissionData.id,
            formData
        );
        
        // Show success message
        window.BlueCred_Utils.showSuccess(`Verification ${formData.outcome.toLowerCase()} successfully`);
        
        // Redirect back to verification page after delay
        setTimeout(() => {
            window.location.href = 'verification.html';
        }, 2000);
        
    } catch (error) {
        console.error('Final verification failed:', error);
        window.BlueCred_Utils.showError(null, 'Verification submission failed');
        
        // Restore button
        const button = document.getElementById('button');
        button.value = 'Final Verification';
        button.disabled = false;
    }
}

function collectFormData() {
    const checkboxes = document.querySelectorAll('.checkbox input[type="checkbox"]');
    const outcome = document.querySelector('.dropbtn').getAttribute('data-selected');
    const comment = document.querySelector('input[placeholder*="Comment"]').value;
    const bcrs = document.querySelector('input[placeholder*="BCRs"]').value;
    
    const checklist = {};
    checkboxes.forEach((checkbox, index) => {
        const label = checkbox.parentElement.textContent.trim();
        checklist[label] = checkbox.checked;
    });
    
    return {
        outcome,
        comment,
        bcrs: parseFloat(bcrs) || 0,
        checklist,
        timestamp: new Date().toISOString(),
        reviewer: 'Current User' // This would come from authentication
    };
}

function validateFormData(formData) {
    if (!formData.outcome) {
        window.BlueCred_Utils.showError(null, 'Please select a verification outcome');
        return false;
    }
    
    if (formData.outcome.toLowerCase() === 'rejected' && !formData.comment.trim()) {
        window.BlueCred_Utils.showError(null, 'Comment is required for rejection');
        return false;
    }
    
    if (formData.outcome.toLowerCase() === 'approved' && formData.bcrs <= 0) {
        window.BlueCred_Utils.showError(null, 'BCRs to issue must be greater than 0 for approval');
        return false;
    }
    
    return true;
}

function calculateAndFillBCRs(submissionData) {
    const bcrInput = document.querySelector('input[placeholder="BCRs To Issue"]');
    if (!bcrInput || !submissionData.data) return;
    
    // Calculate estimated BCRs based on project data
    const projectData = submissionData.data;
    const estimatedCO2e = projectData.area ? Math.floor(projectData.area * 12.5) : 0;
    const estimatedBCRs = estimatedCO2e ? Math.floor(estimatedCO2e / 3994) : 0;
    
    bcrInput.value = estimatedBCRs;
}

function setupAutoSave() {
    const inputs = document.querySelectorAll('input[type="textarea"], input[type="checkbox"]');
    
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            saveFormState();
        });
    });
}

function saveFormState() {
    const formData = collectFormData();
    localStorage.setItem('reportFormState', JSON.stringify(formData));
}

async function loadDefaultProjectData() {
    // Load sample data when no specific submission is selected
    const sampleProject = {
        id: 'SAMPLE-001',
        name: 'Sample Blue Carbon Project',
        location: 'Coastal Mangrove Area',
        projectType: 'Mangrove Restoration',
        area: 150,
        submissionDate: new Date().toISOString(),
        dataPoints: Array(25).fill(null).map((_, i) => ({ id: i, type: 'measurement' })),
        images: Array(8).fill(null).map((_, i) => ({ 
            url: 'assets/placeholder.jpg', 
            description: `Field Image ${i + 1}` 
        })),
        status: 'Under Review',
        verificationScore: 75,
        dataCollectionProgress: 85,
        imageAnalysisProgress: 70,
        fieldVerificationProgress: 45,
        isCompliant: true
    };
    
    updateProjectDetailsSection(sampleProject);
    updateEstimationsSection(sampleProject);
    setupVerificationForm({ data: sampleProject, id: 'sample' });
}

function showErrorState() {
    const containers = document.querySelectorAll('.box');
    containers.forEach(container => {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>Error loading project data</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #005AC6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    });
}

// Global function for image modal
window.openImageModal = function(imageUrl, description) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; text-align: center;">
            <img src="${imageUrl}" alt="${description}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
            <p style="color: white; margin-top: 15px; font-size: 16px;">${description}</p>
            <p style="color: #ccc; margin-top: 10px; font-size: 14px;">Click anywhere to close</p>
        </div>
    `;
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
};

// Export functions for use in other scripts
window.ReportIntegration = {
    loadProjectDetails,
    handleFinalVerification,
    calculateAndFillBCRs
};
