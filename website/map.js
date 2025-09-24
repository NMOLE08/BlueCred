// Coordinates for Mumbai, India
const mumbaiCoords = [19.0760, 72.8777];

// Initialize the map centered on Mumbai with dark theme
const map = L.map('map', {
    center: mumbaiCoords,
    zoom: 10,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: true,
    renderer: L.canvas()
});

// Add Esri World Imagery for satellite view
const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

// Add a semi-transparent dark overlay for better visibility
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    opacity: 0.5,
    attribution: '© OpenStreetMap contributors © CartoDB'
}).addTo(map);

// Add Maharashtra state boundary using OSM boundaries
// Note: For production, consider using a more reliable boundary service
const maharashtraBoundary = L.geoJson(null, {
    style: function() {
        return {
            color: '#4dabf7',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.1,
            fillColor: '#4dabf7'
        };
    }
}).addTo(map);

// Fetch Maharashtra boundary from OSM
fetch('https://nominatim.openstreetmap.org/search?state=Maharashtra&country=India&format=geojson&polygon_geojson=1')
    .then(response => response.json())
    .then(data => {
        maharashtraBoundary.addData(data);
        // Fit the map to the boundary with some padding
        map.fitBounds(maharashtraBoundary.getBounds(), {
            padding: [20, 20]
        });
    })
    .catch(error => {
        console.error('Error fetching boundary data:', error);
    });

// Add a scale control
L.control.scale({
    imperial: false,
    metric: true,
    position: 'bottomright'
}).addTo(map);

// Add zoom control with a better position
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Add a marker for Mumbai
const mumbaiMarker = L.marker(mumbaiCoords, {
    icon: L.divIcon({
        html: '<i class="fa-solid fa-location-dot" style="color: #4dabf7; font-size: 32px; text-shadow: 0 0 8px rgba(0,0,0,0.7);"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        className: 'map-marker'
    })
}).addTo(map);

// Add a circle to highlight the Mumbai area
const mumbaiCircle = L.circle(mumbaiCoords, {
    color: '#4dabf7',
    fillColor: '#4dabf7',
    fillOpacity: 0.2,
    radius: 5000 // 5km radius
}).addTo(map);

mumbaiMarker.bindPopup(
    "<div style='background: #1e293b; color: #f8fafc; padding: 8px; border-radius: 4px;'>" +
    "<b style='color: #60a5fa;'>Mumbai, Maharashtra</b><br>Project Location" +
    "</div>"
).openPopup();

// Add a custom control for layer switching
const baseLayers = {
    "Satellite": satellite,
    "Hybrid": L.layerGroup([satellite, darkLayer])
};

L.control.layers(baseLayers, null, {
    position: 'topright',
    collapsed: false
}).addTo(map);

// Add a custom title
const title = L.control({position: 'topleft'});

title.onAdd = function() {
    const div = L.DomUtil.create('div', 'map-title');
    div.innerHTML = '<h3>Project Locations</h3>';
    return div;
};

title.addTo(map);
