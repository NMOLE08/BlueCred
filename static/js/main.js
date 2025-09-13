// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const frameCount = document.getElementById('frame-count');
const currentFrame = document.getElementById('current-frame');
const currentBiomass = document.getElementById('current-biomass');
const objectsDetected = document.getElementById('objects-detected');
const stopProcessingBtn = document.getElementById('stop-processing');
const videoPreviewSection = document.getElementById('video-preview-section');
const processedVideo = document.getElementById('processed-video');
const resultsSection = document.getElementById('results-section');
const avgBiomass = document.getElementById('avg-biomass');
const totalBiomass = document.getElementById('total-biomass');
const framesProcessed = document.getElementById('frames-processed');
const objectSummary = document.getElementById('object-summary');
const actionsSection = document.getElementById('actions-section');
const processAgainBtn = document.getElementById('process-again');
const downloadReportBtn = document.getElementById('download-report');
const uploadSection = document.getElementById('upload-section');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status');

// Demo-specific elements
const demoSection = document.getElementById('demo-section');
const demoVideo = document.getElementById('demo-video');
const demoCurrentBiomass = document.getElementById('demo-current-biomass');
const demoObjectsCount = document.getElementById('demo-objects-count');
const resetDemoBtn = document.getElementById('reset-demo');
const downloadDemoReportBtn = document.getElementById('download-demo-report');

// Chart instance
let biomassChart = null;

// State
let processing = false;
let progressInterval = null;
let demoInterval = null;
let demoData = {
    biomass: [2.1, 3.4, 4.2, 5.8, 7.1, 8.3, 9.2, 10.1, 11.5, 12.3, 11.8, 10.9, 9.7, 8.4, 7.2],
    objects: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 19, 17, 15, 13, 11],
    currentIndex: 0
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Setup demo button
    const runDemoBtn = document.getElementById('run-demo');
    if (runDemoBtn) {
        runDemoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            startDemo();
        });
    }
    
    // Setup demo-specific event listeners
    if (resetDemoBtn) {
        resetDemoBtn.addEventListener('click', resetDemo);
    }
    
    if (downloadDemoReportBtn) {
        downloadDemoReportBtn.addEventListener('click', downloadDemoReport);
    }
    
    // Setup other event listeners
    setupDragAndDrop();
    setupEventListeners();
});

function setupDragAndDrop() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    fileInput.addEventListener('change', handleFileSelect, false);
}

function setupEventListeners() {
    // Stop processing button
    stopProcessingBtn.addEventListener('click', stopProcessing);
    
    // Process again button
    processAgainBtn.addEventListener('click', resetUI);
    
    // Download report button
    downloadReportBtn.addEventListener('click', downloadReport);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
}

function unhighlight() {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload a valid video file (MP4, MOV, or AVI)');
        return;
    }
    
    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
        showError('File size must be less than 500MB');
        return;
    }
    
    // Upload the file
    await uploadFile(file);
}

async function uploadFile() {
    try {
        updateStatus('Loading demo video...', 'blue');
        
        const response = await fetch('/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load demo video');
        }
        
        const data = await response.json();
        updateStatus('Processing video...', 'blue');
        
        // Show progress section
        uploadSection.classList.add('hidden');
        progressSection.classList.remove('hidden');
        
        // Show the video preview immediately
        videoPreviewSection.classList.remove('hidden');
        processedVideo.src = data.original_video_url;
        
        // Automatically show results after a short delay
        setTimeout(() => {
            showResults({
                original_video_url: data.original_video_url,
                is_demo: true,
                avg_biomass: 8.0,
                total_biomass: 54.5,
                progress: 100
            });
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred');
    }
}

function startProgressPolling() {
    // Clear any existing interval
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Poll for progress every second
    progressInterval = setInterval(fetchProgress, 1000);
    
    // Initial fetch
    fetchProgress();
}

async function fetchProgress() {
    try {
        const response = await fetch('/progress');
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateProgress(data);
        
        // If processing is complete, show results
        if (!data.is_processing && data.progress === 100) {
            clearInterval(progressInterval);
            showResults(data);
        }
        
    } catch (error) {
        console.error('Error fetching progress:', error);
        clearInterval(progressInterval);
        showError('Error fetching progress: ' + error.message);
    }
}

function updateProgress(data) {
    // Update progress bar
    const progress = Math.round(data.progress);
    progressBar.style.width = `${progress}%`;
    progressPercentage.textContent = `${progress}%`;
    
    // Update frame count
    frameCount.textContent = `Frame ${data.current_frame}/${data.total_frames}`;
    
    // Update current frame
    currentFrame.textContent = data.current_frame || '0';
    
    // Update current biomass during processing
    if (data.current_biomass !== undefined) {
        currentBiomass.textContent = `${data.current_biomass.toFixed(2)} kg`;
    }
    
    // Update current biomass if available
    if (data.current_biomass !== undefined) {
        currentBiomass.textContent = `${data.current_biomass.toFixed(2)} kg`;
    }
    
    // Update objects detected if available
    if (data.objects_detected !== undefined) {
        objectsDetected.textContent = data.objects_detected;
    }
}

function showResults(data) {
    console.log('Showing results:', data);
    
    // Hide progress section, show results
    progressSection.classList.add('hidden');
    videoPreviewSection.classList.remove('hidden');
    resultsSection.classList.remove('hidden');
    actionsSection.classList.remove('hidden');
    
    // Use the demo video URL if available
    const videoUrl = data.original_video_url || '/static/demo/demo.mp4';
    console.log('Setting video source to:', videoUrl);
    
    // Set the video source
    const videoElement = document.querySelector('#results-section video');
    if (videoElement) {
        videoElement.src = videoUrl;
        
        // Try to play the video automatically
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Error playing video:', error);
                // Show a message if the video can't be played
                const videoContainer = videoElement.parentElement;
                if (videoContainer) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'text-red-500 text-center p-4';
                    errorMsg.textContent = 'Could not play video automatically. Please press play to start the video.';
                    videoContainer.appendChild(errorMsg);
                }
            });
        }
    }
    
    // Update biomass metrics with demo values
    const totalBiomass = data.total_biomass || 54.5; // Default demo value
    const avgBiomass = data.avg_biomass || 8.0; // Default demo value
    
    // Update the final biomass display
    const finalBiomassElement = document.getElementById('final-biomass');
    if (finalBiomassElement) {
        finalBiomassElement.textContent = `${totalBiomass.toFixed(1)} kg`;
    }
    
    // Update the average biomass display
    const avgBiomassElement = document.querySelector('#results-section .text-xl.font-semibold.text-blue-700');
    if (avgBiomassElement) {
        avgBiomassElement.textContent = `${avgBiomass.toFixed(1)} kg`;
    }
    
    // Update status and scroll to results
    updateStatus('Analysis complete', 'green');
    
    // Smooth scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 500);
    
    // Show the actions section
    actionsSection.classList.remove('hidden');
}

function createBiomassChart(biomassData) {
    const ctx = document.getElementById('biomass-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (biomassChart) {
        biomassChart.destroy();
    }
    
    const labels = biomassData.map((_, index) => `Frame ${index + 1}`);
    const data = biomassData.map(item => item.biomass);
    
    biomassChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Biomass (kg)',
                data: data,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Biomass: ${context.parsed.y.toFixed(2)} kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Biomass (kg)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Frame Number'
                    }
                }
            }
        }
    });
}

function updateObjectSummary(biomassData) {
    // Group by object type and calculate metrics
    const objectTypes = {};
    
    biomassData.forEach(frame => {
        if (frame.detections && frame.detections.length > 0) {
            frame.detections.forEach(detection => {
                const type = detection.class || 'Unknown';
                if (!objectTypes[type]) {
                    objectTypes[type] = {
                        count: 0,
                        totalBiomass: 0
                    };
                }
                objectTypes[type].count++;
                objectTypes[type].totalBiomass += frame.biomass;
            });
        }
    });
    
    // Update the table
    const tbody = document.createElement('tbody');
    
    Object.entries(objectTypes).forEach(([type, data]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const avgBiomass = data.count > 0 ? (data.totalBiomass / data.count) : 0;
        
        row.innerHTML = `
            <td class="py-2 px-4 border-b">${type}</td>
            <td class="py-2 px-4 border-b text-right">${data.count}</td>
            <td class="py-2 px-4 border-b text-right">${avgBiomass.toFixed(2)} kg</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add a row for frames with no detections
    const noDetectionFrames = biomassData.filter(frame => !frame.detections || frame.detections.length === 0).length;
    if (noDetectionFrames > 0) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="py-2 px-4 border-b">No objects detected</td>
            <td class="py-2 px-4 border-b text-right">${noDetectionFrames}</td>
            <td class="py-2 px-4 border-b text-right">0.00 kg</td>
        `;
        
        tbody.appendChild(row);
    }
    
    // Replace the table body
    objectSummary.innerHTML = '';
    objectSummary.appendChild(tbody);
}

async function stopProcessing() {
    try {
        const response = await fetch('/stop_processing', {
            method: 'POST'
        });
        
        const data = await response.json();
        updateStatus('Processing stopped', 'yellow');
        
    } catch (error) {
        console.error('Error stopping processing:', error);
        showError('Error stopping processing: ' + error.message);
    }
}

function resetUI() {
    // Reset progress
    progressBar.style.width = '0%';
    progressPercentage.textContent = '0%';
    frameCount.textContent = 'Frame 0/0';
    currentFrame.textContent = '0';
    currentBiomass.textContent = '0.00 kg';
    objectsDetected.textContent = '0';
    
    // Reset video
    if (processedVideo) {
        processedVideo.pause();
        processedVideo.currentTime = 0;
    }
    
    // Reset UI state
    uploadSection.classList.remove('hidden');
    progressSection.classList.add('hidden');
    videoPreviewSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    actionsSection.classList.add('hidden');
    
    // Reset status
    updateStatus('Ready', 'green');
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Reset file input
    fileInput.value = '';
}

function downloadReport() {
    // This is a placeholder for the report download functionality
    // In a real application, you would generate a PDF or other report format
    alert('Report download functionality would be implemented here');
}

function updateStatus(message, color) {
    statusText.textContent = message;
    
    // Update status indicator color
    const colors = {
        'green': 'bg-green-500',
        'blue': 'bg-blue-500',
        'yellow': 'bg-yellow-500',
        'red': 'bg-red-500'
    };
    
    // Remove all color classes
    Object.values(colors).forEach(cls => {
        statusIndicator.classList.remove(cls);
    });
    
    // Add the new color class
    statusIndicator.classList.add(colors[color] || 'bg-gray-500');
}

function showError(message) {
    // Show error message (you could use a more sophisticated notification system)
    alert('Error: ' + message);
    updateStatus('Error', 'red');
}

// Demo Functions
function startDemo() {
    try {
        updateStatus('Starting demo...', 'blue');
        
        // Hide upload section and show demo section
        if (uploadSection) {
            uploadSection.classList.add('hidden');
        }
        
        if (demoSection) {
            demoSection.classList.remove('hidden');
        }
        
        // Reset demo data
        demoData.currentIndex = 0;
        
        // Start the demo video
        if (demoVideo) {
            demoVideo.currentTime = 0;
            const playPromise = demoVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Error playing demo video:', error);
                });
            }
        }
        
        // Start real-time biomass simulation
        startBiomassSimulation();
        
        updateStatus('Demo running', 'green');
        
        // Scroll to demo section
        setTimeout(() => {
            if (demoSection) {
                demoSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
        
    } catch (error) {
        console.error('Error starting demo:', error);
        showError('Failed to start demo: ' + error.message);
    }
}

function startBiomassSimulation() {
    // Clear any existing interval
    if (demoInterval) {
        clearInterval(demoInterval);
    }
    
    // Update biomass data every 1 second to simulate real-time analysis
    demoInterval = setInterval(() => {
        if (demoData.currentIndex < demoData.biomass.length) {
            // Update current biomass
            if (demoCurrentBiomass) {
                demoCurrentBiomass.textContent = `${demoData.biomass[demoData.currentIndex].toFixed(1)} kg`;
            }
            
            // Update objects count
            if (demoObjectsCount) {
                demoObjectsCount.textContent = demoData.objects[demoData.currentIndex];
            }
            
            demoData.currentIndex++;
        } else {
            // Demo completed
            clearInterval(demoInterval);
            updateStatus('Demo completed', 'green');
        }
    }, 1000);
}

function resetDemo() {
    // Clear demo interval
    if (demoInterval) {
        clearInterval(demoInterval);
    }
    
    // Reset demo data
    demoData.currentIndex = 0;
    
    // Reset video
    if (demoVideo) {
        demoVideo.pause();
        demoVideo.currentTime = 0;
    }
    
    // Reset biomass display
    if (demoCurrentBiomass) {
        demoCurrentBiomass.textContent = '0.0 kg';
    }
    
    if (demoObjectsCount) {
        demoObjectsCount.textContent = '0';
    }
    
    // Hide demo section and show upload section
    demoSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    
    // Reset status
    updateStatus('Ready', 'green');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function downloadDemoReport() {
    // Create a simple demo report
    const reportData = {
        timestamp: new Date().toISOString(),
        videoInfo: {
            duration: '15 seconds',
            resolution: '1920x1080',
            frameRate: '30 FPS'
        },
        biomassAnalysis: {
            totalBiomass: '54.5 kg',
            averagePerFrame: '8.0 kg',
            peakBiomass: '12.3 kg',
            confidenceScore: '94.2%'
        },
        modelPredictions: {
            seagrassCoverage: '85.3%',
            coralDensity: 'Medium',
            fishCount: 12,
            waterClarity: 'Good'
        },
        realTimeData: demoData
    };
    
    // Create and download JSON report
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `biomass_demo_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    updateStatus('Demo report downloaded', 'green');
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    if (demoInterval) {
        clearInterval(demoInterval);
    }
    
    // Send a request to stop any ongoing processing
    if (processing) {
        fetch('/stop_processing', { method: 'POST' });
    }
});
