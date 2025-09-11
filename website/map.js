// Initialize the map centered on India
const map = L.map('map').setView([20.5937, 78.9629], 5);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add a marker (optional)
const marker = L.marker([20.5937, 78.9629]).addTo(map);
marker.bindPopup("<b>India</b><br>Your location").openPopup();
