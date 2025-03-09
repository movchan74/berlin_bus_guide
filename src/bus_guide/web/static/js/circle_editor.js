// Global variables for circle and article management
var selectedArticles = [];
var selectedArticleTitles = {};
var currentCircleId = null;
var circleData = null;
var allCircles = [];
var currentArticleForAssignment = null;
var currentArticleLocation = null;

// Function to initialize the article data
function initializeArticleData() {
    fetch('/api/circles')
        .then(response => response.json())
        .then(data => {
            allCircles = data;
        })
        .catch(error => console.error('Error loading circles:', error));
}

// Functions for circle panel
function showCirclePanel() {
    document.getElementById('circle-panel').style.display = 'block';
}

function hideCirclePanel() {
    document.getElementById('circle-panel').style.display = 'none';
}

// Functions for nearby circles panel
function showNearbyCirclesPanel() {
    document.getElementById('nearby-circles-panel').style.display = 'block';
}

function hideNearbyCirclesPanel() {
    document.getElementById('nearby-circles-panel').style.display = 'none';
}

// Update the assigned articles list
function updateAssignedArticles() {
    const container = document.getElementById('assigned-articles');
    
    if (!circleData || !circleData.articles || circleData.articles.length === 0) {
        container.innerHTML = '<p>No articles assigned to this circle</p>';
        return;
    }
    
    let html = '<ul id="assigned-articles-list" class="article-list">';
    circleData.articles.forEach(articleId => {
        // Get article title
        const articleTitle = getArticleTitle(articleId);
        
        html += `
            <li>
                ${articleTitle}
                <button class="remove-btn" onclick="removeAssignedArticle(${articleId})">✕</button>
            </li>
        `;
    });
    html += '</ul>';
    
    container.innerHTML = html;
    
    // Notify parent window about article update
    notifyParentOfArticles();
}

// Get article title by ID
function getArticleTitle(articleId) {
    if (selectedArticleTitles[articleId]) {
        return selectedArticleTitles[articleId];
    }
    return `Article ${articleId}`;
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // distance in meters
}

// Find nearby circles to a specific location
function findNearbyCircles(lat, lon) {
    return allCircles.filter(circle => {
        const circleLat = circle.center[0];
        const circleLon = circle.center[1];
        const distance = calculateDistance(lat, lon, circleLat, circleLon);
        
        // Return circles within 1000 meters or those that contain the point
        return distance <= 1000 || distance <= circle.radius;
    }).sort((a, b) => {
        // Sort by distance
        const distA = calculateDistance(lat, lon, a.center[0], a.center[1]);
        const distB = calculateDistance(lat, lon, b.center[0], b.center[1]);
        return distA - distB;
    });
}

// Show nearby circles to an article location
function showNearbyCircles(articleId, lat, lon, title) {
    currentArticleForAssignment = {
        id: articleId,
        title: title
    };
    currentArticleLocation = [lat, lon];
    
    // Show article title
    document.getElementById('article-to-assign').textContent = `Article: ${title}`;
    
    // Find and display nearby circles
    const nearbyCircles = findNearbyCircles(lat, lon);
    const listContainer = document.getElementById('nearby-circles-list');
    
    if (nearbyCircles.length === 0) {
        listContainer.innerHTML = '<p class="no-circles-message">No circles found nearby</p>';
    } else {
        let html = '';
        nearbyCircles.forEach(circle => {
            const distance = calculateDistance(lat, lon, circle.center[0], circle.center[1]);
            html += `
                <div class="circle-option" onclick="assignArticleToCircle(${articleId}, '${circle.id}', '${title}')">
                    <strong>${circle.name || 'Unnamed Circle'}</strong>
                    <div>Distance: ${Math.round(distance)} meters</div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }
    
    showNearbyCirclesPanel();
}

// Assign an article to a specific circle
function assignArticleToCircle(articleId, circleId, articleTitle) {
    fetch('/get-circle/' + circleId)
        .then(response => response.json())
        .then(data => {
            // Add article to circle's articles
            const articles = data.articles || [];
            
            // Convert article ID to integer
            articleId = parseInt(articleId);
            
            // Check if article is already in the circle
            if (!articles.includes(articleId)) {
                articles.push(articleId);
                
                // Save the updated circle
                return fetch('/save-circle', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        id: circleId,
                        name: data.name,
                        center: data.center,
                        radius: data.radius,
                        color: data.color,
                        articles: articles
                    })
                });
            } else {
                throw new Error('Article is already assigned to this circle');
            }
        })
        .then(response => response.json())
        .then(data => {
            alert('Article successfully assigned to circle!');
            hideNearbyCirclesPanel();
            
            // If this is the current circle, refresh the articles list
            if (currentCircleId === circleId) {
                loadCircleData();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (error.message === 'Article is already assigned to this circle') {
                alert('This article is already assigned to the selected circle.');
            } else {
                alert('Error assigning article to circle.');
            }
        });
}

// Create a new circle for the current article
function createCircleForArticle() {
    if (!currentArticleForAssignment || !currentArticleLocation) {
        alert('No article selected for assignment');
        return;
    }
    
    const articleId = currentArticleForAssignment.id;
    const articleTitle = currentArticleForAssignment.title;
    const [lat, lon] = currentArticleLocation;
    
    // Generate a unique ID
    const circleId = 'circle_' + Date.now();
    
    // Create circle with default radius around the article
    const newCircle = {
        id: circleId,
        name: 'Circle for ' + articleTitle,
        center: [lat, lon],
        radius: 200,  // Default radius in meters
        color: '#95276E',
        articles: [parseInt(articleId)]
    };
    
    // Create the circle
    fetch('/save-circle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newCircle)
    })
    .then(response => response.json())
    .then(data => {
        alert('New circle created with the article assigned!');
        hideNearbyCirclesPanel();
        
        // Reload the page to show the new circle
        window.location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating circle');
    });
}

// Remove article from circle
function removeAssignedArticle(articleId) {
    if (!currentCircleId) return;
    
    if (confirm("Are you sure you want to remove this article from the circle?")) {
        fetch('/remove-article-from-circle', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                circle_id: currentCircleId,
                article_id: parseInt(articleId)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'removed') {
                // Refresh circle data
                loadCircleData();
            } else {
                alert("Error removing article: " + data.status);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error removing article");
        });
    }
}

// Select a circle for editing
function selectCircle(circleId) {
    currentCircleId = circleId;
    loadCircleData();
    showCirclePanel();
    
    // Notify the parent window
    notifyParentOfSelection();
}

// Load circle data
function loadCircleData() {
    if (!currentCircleId) return;
    
    fetch('/get-circle/' + currentCircleId)
        .then(response => response.json())
        .then(data => {
            circleData = data;
            document.getElementById('circle-name').value = data.name || '';
            updateAssignedArticles();
            
            // Notify the parent window
            notifyParentOfSelection();
        })
        .catch(error => {
            console.error('Error loading circle data:', error);
            alert("Error loading circle data");
        });
}

// Save circle
function saveCircle() {
    if (!currentCircleId || !circleData) {
        alert("No circle selected!");
        return;
    }
    
    const name = document.getElementById('circle-name').value.trim() || 'Unnamed Circle';
    
    // Update the circle data
    fetch('/save-circle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: currentCircleId,
            name: name,
            center: circleData.center,
            radius: circleData.radius,
            color: circleData.color,
            articles: circleData.articles || []
        })
    })
    .then(response => response.json())
    .then(data => {
        alert("Circle saved successfully!");
        
        // Reload circle data and refresh all circles
        loadCircleData();
        initializeArticleData();
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Error saving circle");
    });
}

// Delete circle
function deleteCircle() {
    if (!currentCircleId) return;
    
    if (confirm("Are you sure you want to delete this circle?")) {
        fetch('/delete-circle/' + currentCircleId, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                alert("Circle deleted successfully!");
                hideCirclePanel();
                
                // Reset current circle
                currentCircleId = null;
                circleData = null;
                
                // Reload the page to update the map
                window.location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Error deleting circle");
            });
    }
}

// Handle new circle from drawing
function handleNewCircle(layer) {
    const center = [layer.getLatLng().lat, layer.getLatLng().lng];
    const radius = layer.getRadius();
    
    // Generate unique ID
    const circleId = 'circle_' + Date.now();
    currentCircleId = circleId;
    
    // Create new circle data
    circleData = {
        id: circleId,
        name: 'New Circle',
        center: center,
        radius: radius,
        color: '#95276E',
        articles: []
    };
    
    // Update UI
    document.getElementById('circle-name').value = circleData.name;
    updateAssignedArticles();
    showCirclePanel();
    
    // Save to server immediately
    fetch('/save-circle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(circleData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Circle created:', data);
        
        // Refresh circles list
        initializeArticleData();
        
        // Notify parent of selection
        notifyParentOfSelection();
    })
    .catch(error => {
        console.error('Error creating circle:', error);
    });
}

// Communicate with parent window when circle is selected
function notifyParentOfSelection() {
    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
            type: 'circle_selected',
            circle: circleData
        }, '*');
    }
}

// Communicate with parent when articles are updated
function notifyParentOfArticles() {
    if (window.parent && window.parent.postMessage && circleData) {
        const articles = circleData.articles.map(articleId => ({
            id: articleId,
            title: getArticleTitle(articleId)
        }));
        
        window.parent.postMessage({
            type: 'articles_updated',
            articles: articles
        }, '*');
    }
}

// Initialize map interactions
function initializeMapInteractions() {
    // Get all circles on the map
    var circles = document.querySelectorAll('.leaflet-circle-marker');
    
    circles.forEach(function(circle) {
        // Extract circle ID from the element
        var circleId = circle.getAttribute('data-circle-id');
        if (!circleId) {
            // Try to extract from parent
            var parent = circle.closest('[data-circle-id]');
            if (parent) {
                circleId = parent.getAttribute('data-circle-id');
            }
        }
        
        if (circleId) {
            circle.addEventListener('click', function(e) {
                console.log('Circle clicked:', circleId);
                e.stopPropagation();
                selectCircle(circleId);
            });
        }
    });
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize circle data
    initializeArticleData();
    
    // Attach event handlers for editor buttons
    document.getElementById('save-circle-btn').addEventListener('click', saveCircle);
    document.getElementById('delete-circle-btn').addEventListener('click', deleteCircle);
    document.getElementById('close-panel-btn').addEventListener('click', hideCirclePanel);
    document.getElementById('create-circle-btn').addEventListener('click', createCircleForArticle);
    document.getElementById('close-nearby-panel-btn').addEventListener('click', hideNearbyCirclesPanel);
    
    // Initialize map interactions after a short delay to ensure map is loaded
    setTimeout(initializeMapInteractions, 1500);
});