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

// Minting elements
const mintTokensBtn = document.getElementById('mint-tokens');
const recipientAddress = document.getElementById('recipient-address');
const manualCarbonKg = document.getElementById('manual-carbon-kg');
const creditsToMint = document.getElementById('credits-to-mint');
const mintStatus = document.getElementById('mint-status');
const carbonKg = document.getElementById('carbon-kg');
const finalBiomass = document.getElementById('final-biomass');
const transactionDetails = document.getElementById('transaction-details');
const txHash = document.getElementById('tx-hash');
const blockNumber = document.getElementById('block-number');
const gasUsed = document.getElementById('gas-used');
const txStatus = document.getElementById('tx-status');

// Chart instance
let biomassChart = null;

// State
let processing = false;
let progressInterval = null;
let mintCallCount = 0;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Setup demo button
    const runDemoBtn = document.getElementById('run-demo');
    if (runDemoBtn) {
        runDemoBtn.addEventListener('click', () => {
            uploadFile();
        });
    }
    
    // Setup mint tokens button
    if (mintTokensBtn) {
        console.log('Setting up mint tokens button event listener');
        mintTokensBtn.addEventListener('click', (event) => {
            console.log(`mintTokens button clicked (mintCallCount: ${mintCallCount})`);
            console.log('Manual carbon input value:', manualCarbonKg.value);
            console.log('Detected carbon value:', carbonKg.textContent);
            event.preventDefault(); // Prevent any default form behavior
            event.stopPropagation(); // Prevent event bubbling
            mintTokens();
        });
        console.log('Mint tokens button event listener setup complete');
    }
    
    // Setup manual carbon input change listener
    if (manualCarbonKg) {
        console.log('Setting up manual carbon input change listener');
        manualCarbonKg.addEventListener('input', (event) => {
            console.log('Manual carbon input changed:', event.target.value);
            updateCreditsToMint();
        });
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
    
    // Check if user has already entered manual input
    const manualValue = parseFloat(manualCarbonKg.value);
    const hasManualInput = manualCarbonKg.value && manualCarbonKg.value.trim() !== '' && !isNaN(manualValue) && manualValue > 0;
    
    console.log('showResults: hasManualInput =', hasManualInput, 'manualValue =', manualValue);
    
    // Only update biomass metrics if user hasn't entered manual input
    if (!hasManualInput) {
        console.log('showResults: No manual input, updating with demo values');
        
        // Update biomass metrics with demo values
        const totalBiomass = data.total_biomass || 54.5; // Default demo value
        const avgBiomass = data.avg_biomass || 8.0; // Default demo value
        
        // Update the final biomass display
        const finalBiomassElement = document.getElementById('final-biomass');
        if (finalBiomassElement) {
            finalBiomassElement.textContent = `${totalBiomass.toFixed(1)} kg`;
        }
        
        // Update carbon kg (typically 50% of biomass) - only if no manual input
        const carbonKgValue = totalBiomass * 0.5;
        const carbonKgElement = document.getElementById('carbon-kg');
        if (carbonKgElement) {
            carbonKgElement.textContent = carbonKgValue.toFixed(2);
        }
        
        // Update the average biomass display
        const avgBiomassElement = document.querySelector('#results-section .text-xl.font-semibold.text-blue-700');
        if (avgBiomassElement) {
            avgBiomassElement.textContent = `${avgBiomass.toFixed(1)} kg`;
        }
    } else {
        console.log('showResults: Manual input detected, preserving user input');
    }
    
    // Update credits to mint display (this will respect manual input if present)
    updateCreditsToMint();
    
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Send a request to stop any ongoing processing
    if (processing) {
        fetch('/stop_processing', { method: 'POST' });
    }
});

// Minting Functions
function updateCreditsToMint() {
    // Get carbon kg from manual input or use detected value
    const manualValue = parseFloat(manualCarbonKg.value);
    const detectedValue = parseFloat(carbonKg.textContent) || 27.25;
    
    // Use manual value if provided and valid, otherwise use detected value
    let carbonKgValue;
    let sourceText;
    let isManual = false;
    
    if (manualCarbonKg.value && manualCarbonKg.value.trim() !== '' && !isNaN(manualValue) && manualValue > 0) {
        carbonKgValue = manualValue;
        sourceText = ` (manual: ${manualValue} kg)`;
        isManual = true;
    } else {
        carbonKgValue = detectedValue;
        sourceText = ` (detected: ${detectedValue} kg)`;
        isManual = false;
    }
    
    console.log(`updateCreditsToMint: carbonKgValue = ${carbonKgValue}${sourceText}`);
    
    // Convert kg to tonnes (1 tonne = 1000 kg, 1 tonne = 1 NCT)
    const tonnes = carbonKgValue / 1000;
    const nctTokens = Math.round(tonnes * 100) / 100; // Round to 2 decimal places
    
    console.log(`updateCreditsToMint: ${carbonKgValue} kg = ${tonnes} tonnes = ${nctTokens} NCT`);
    
    // Update credits to mint display
    if (creditsToMint) {
        creditsToMint.textContent = `${nctTokens} NCT`;
        
        // Add visual indicator for manual vs detected
        if (isManual) {
            creditsToMint.className = 'text-2xl font-bold text-green-600';
            creditsToMint.title = 'Using manual carbon input';
        } else {
            creditsToMint.className = 'text-2xl font-bold text-blue-600';
            creditsToMint.title = 'Using detected carbon values';
        }
    }
    
    // Update source indicator if it exists
    const sourceIndicator = document.getElementById('carbon-source-indicator');
    if (sourceIndicator) {
        if (isManual) {
            sourceIndicator.textContent = 'Manual Input';
            sourceIndicator.className = 'text-xs font-semibold text-green-600';
        } else {
            sourceIndicator.textContent = 'Detected';
            sourceIndicator.className = 'text-xs font-semibold text-blue-600';
        }
    }
}

async function mintTokens() {
    mintCallCount++;
    console.log(`=== mintTokens called (call #${mintCallCount}) ===`);
    
    // Prevent multiple rapid clicks
    if (mintTokensBtn.disabled) {
        console.log(`mintTokens (#${mintCallCount}): Button already disabled, ignoring duplicate call`);
        return;
    }
    
    if (!recipientAddress.value) {
        alert('Please enter a recipient address');
        return;
    }
    
    // Get carbon kg from manual input or use detected value (same logic as updateCreditsToMint)
    const manualValue = parseFloat(manualCarbonKg.value);
    const detectedValue = parseFloat(carbonKg.textContent) || 27.25;
    
    let carbonKgValue;
    let sourceText;
    
    if (manualCarbonKg.value && manualCarbonKg.value.trim() !== '' && !isNaN(manualValue) && manualValue > 0) {
        carbonKgValue = manualValue;
        sourceText = ` (manual: ${manualValue} kg)`;
        console.log(`mintTokens: Using MANUAL input: ${manualValue} kg`);
    } else {
        carbonKgValue = detectedValue;
        sourceText = ` (detected: ${detectedValue} kg)`;
        console.log(`mintTokens: Using DETECTED value: ${detectedValue} kg`);
    }
    
    console.log(`mintTokens: Final carbonKgValue = ${carbonKgValue}${sourceText}`);
    
    // Update status
    if (mintStatus) {
        mintStatus.textContent = 'Minting...';
        mintStatus.className = 'text-sm font-semibold text-yellow-300';
    }
    
    if (mintTokensBtn) {
        mintTokensBtn.disabled = true;
        mintTokensBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Minting...';
    }
    
    try {
        // Call the backend to mint tokens
        const response = await fetch('http://127.0.0.1:5001/api/projects/BIOMASS_DEMO_PROJECT/ml-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ml-secret': '7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e'
            },
            body: JSON.stringify({
                carbonKg: carbonKgValue,
                recipientAddress: recipientAddress.value,
                biomassData: {
                    total_biomass: parseFloat(finalBiomass.textContent) || 54.5,
                    carbon_kg: carbonKgValue,
                    confidence: 95
                }
            })
        });
        
        console.log('mintTokens: Response status:', response.status);
        
        const result = await response.json();
        console.log('mintTokens: Response result:', result);
        
        if (response.ok) {
            // Success
            console.log('mintTokens: SUCCESS - Minting completed successfully');
            console.log(`mintTokens: Minted ${result.data.tokensRoundedDown} NCT tokens`);
            console.log(`mintTokens: Transaction hash: ${result.data.transactionHash}`);
            
            if (mintStatus) {
                mintStatus.textContent = 'Success';
                mintStatus.className = 'text-sm font-semibold text-green-300';
            }
            
            // Show transaction details
            if (transactionDetails) {
                transactionDetails.classList.remove('hidden');
                if (txHash) txHash.textContent = result.data.transactionHash || '0x...';
                if (blockNumber) blockNumber.textContent = result.data.blockNumber || '-';
                if (gasUsed) gasUsed.textContent = result.data.gasUsed || '-';
                if (txStatus) txStatus.textContent = '✅ Success';
            }
            
            // Calculate tokens for display
            const tonnes = carbonKgValue / 1000;
            const nctTokens = Math.round(tonnes * 100) / 100;
            
            alert(`Successfully minted ${nctTokens} NCT tokens!`);
        } else {
            // Error - throw to be caught by catch block
            throw new Error(result.error || `HTTP ${response.status}: ${result.message || 'Minting failed'}`);
        }
    } catch (error) {
        console.error('mintTokens: ERROR:', error);
        console.error('mintTokens: Error details:', error.message, error.stack);
        
        if (mintStatus) {
            mintStatus.textContent = 'Failed';
            mintStatus.className = 'text-sm font-semibold text-red-300';
        }
        
        // Only show error alert if it's not a network error that might be transient
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            alert('Network error: Please check if the backend is running and try again.');
        } else {
            alert('Minting failed: ' + error.message);
        }
    } finally {
        // Reset button
        if (mintTokensBtn) {
            mintTokensBtn.disabled = false;
            mintTokensBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Mint Carbon Credits';
        }
    }
}
