import json
import math
import os
import random
from pathlib import Path
from urllib.parse import quote

import folium
from folium.plugins import Draw, GroupedLayerControl, MarkerCluster


def load_json_file(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def create_map(edit_mode=False):
    # Load data
    base_path = Path(__file__).parent.parent.parent
    bus_route = load_json_file(base_path / "routes/bus100.geojson")
    wiki_articles = load_json_file(base_path / "data/wiki_articles.json")

    # Load saved circles if they exist
    circles_path = base_path / "data/user_circles.json"
    saved_circles = load_json_file(circles_path)

    # Create map centered on Berlin
    m = folium.Map(
        location=[52.52, 13.38],  # Berlin center coordinates
        zoom_start=13,
        tiles="OpenStreetMap",
    )

    # Create feature groups for different languages
    articles_en = folium.FeatureGroup(name="Points of Interest (EN)", show=True)
    articles_de = folium.FeatureGroup(name="Sehenswürdigkeiten (DE)", show=False)
    user_circles = folium.FeatureGroup(name="User Circles", show=True)

    # Create separate marker clusters for each language
    marker_cluster_en = MarkerCluster()
    marker_cluster_de = MarkerCluster()
    marker_cluster_en.add_to(articles_en)
    marker_cluster_de.add_to(articles_de)

    # Add bus route and stops
    for feature in bus_route["features"]:
        if feature["geometry"]["type"] == "MultiLineString":
            folium.PolyLine(
                locations=[
                    [coord[1], coord[0]]
                    for segment in feature["geometry"]["coordinates"]
                    for coord in segment
                ],
                color="#95276E",  # Using the bus line's official color
                weight=3,
                opacity=0.8,
                popup="Bus 100",
            ).add_to(m)
        elif feature["geometry"]["type"] == "Point":
            # Add bus stops
            folium.CircleMarker(
                location=[
                    feature["geometry"]["coordinates"][1],
                    feature["geometry"]["coordinates"][0],
                ],
                radius=5,
                color="#95276E",
                fill=True,
                popup="Bus Stop",
            ).add_to(m)

    # Track locations to handle duplicate coordinates
    location_map = {}

    # Create a dictionary of all articles by ID for reference
    all_articles = {i: article for i, article in enumerate(wiki_articles)}

    # Add Wikipedia articles as markers
    for i, article in enumerate(wiki_articles):
        lang = article.get("lang", "en")  # Default to English if not specified
        wiki_url = f"https://{lang}.wikipedia.org/wiki/{quote(article['title'])}"

        # Create a small offset for markers at the same location
        location_key = f"{article['lat']:.6f}_{article['lon']:.6f}"
        if location_key in location_map:
            location_map[location_key] += 1
            # Add a small random offset to prevent markers from stacking
            lat_offset = random.uniform(-0.0001, 0.0001)
            lon_offset = random.uniform(-0.0001, 0.0001)
            location = [article["lat"] + lat_offset, article["lon"] + lon_offset]
        else:
            location_map[location_key] = 1
            location = [article["lat"], article["lon"]]

        # Add article ID to popup for reference in editor mode
        popup_html = f"""
            <b>{article["title"]}</b><br>
            <a href="{wiki_url}" target="_blank">Read on Wikipedia</a>
        """

        if edit_mode:
            # In edit mode, show a button to assign article to circles
            # Also add article data attributes for finding nearby circles
            popup_html += f"""
            <br>
            <button onclick="showNearbyCircles({i}, {article["lat"]}, {article["lon"]}, '{article["title"]}')">
                Assign to Circle
            </button>
            <div class="article-data" 
                 data-article-id="{i}" 
                 data-article-lat="{article["lat"]}" 
                 data-article-lon="{article["lon"]}"
                 data-article-title="{article["title"]}">
            </div>
            """

        marker = folium.Marker(
            location=location,
            popup=folium.Popup(popup_html, max_width=300),
            icon=folium.Icon(color="blue" if lang == "en" else "red", icon="info-sign"),
        )

        # Add markers to the appropriate cluster based on language
        if lang == "en":
            marker.add_to(marker_cluster_en)
        else:
            marker.add_to(marker_cluster_de)

    # Add circles to the map - simplified to just render circles with minimal information
    # All interactions will be handled by JavaScript API calls
    for circle in saved_circles:
        # Minimal popup with just the circle name
        popup_content = f"""<b>{circle["name"]}</b>"""
        
        # Create circle with minimal configuration
        circle_obj = folium.Circle(
            location=circle["center"],
            radius=circle["radius"],
            color=circle["color"],
            fill=True,
            fill_color=circle["color"],
            fill_opacity=0.2,
            popup=folium.Popup(popup_content, max_width=300),
            tooltip=circle["name"],
        )
        
        # Add data attributes for JavaScript interaction
        circle_obj._id = circle["id"]
        circle_obj.add_to(user_circles)
        
        # Add custom data attribute for JavaScript to identify this circle
        circle_obj.add_child(
            folium.Element(f"""
            <script>
                (function() {{
                    var circle = document.currentScript.parentElement;
                    circle.setAttribute('data-circle-id', '{circle["id"]}');
                    
                    // If in edit mode, add event listener for circle selection
                    if ({str(edit_mode).lower()}) {{
                        circle.addEventListener('click', function(e) {{
                            e.originalEvent.stopPropagation();
                            window.selectCircle('{circle["id"]}');
                        }});
                    }}
                }})();
            </script>
            """)
        )

    # Add the feature groups to the map
    articles_en.add_to(m)
    articles_de.add_to(m)
    user_circles.add_to(m)

    # Add edit tools if in edit mode
    if edit_mode:
        draw = Draw(
            draw_options={
                "polyline": False,
                "rectangle": False,
                "polygon": False,
                "marker": False,
                "circlemarker": False,
                "circle": True,
            },
            edit_options={"edit": True, "remove": True},
        )
        draw.add_to(m)

        # Add external CSS and JavaScript files
        m.get_root().header.add_child(folium.Element(
            '<link rel="stylesheet" href="/static/css/circle_editor.css">'
        ))
        
        # Add HTML templates for editor panels
        with open(base_path / "web/static/html/circle_editor_panels.html", "r") as f:
            panels_html = f.read()
        m.get_root().html.add_child(folium.Element(panels_html))
        
        # Add JavaScript for circle editor functionality
        m.get_root().html.add_child(folium.Element(
            '<script src="/static/js/circle_editor.js"></script>'
        ))
        
        # Add custom JavaScript initialization to properly hook into the draw create events
        m.get_root().html.add_child(folium.Element("""
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Wait for Leaflet and Draw plugin to initialize
                setTimeout(function() {
                    if (typeof L !== 'undefined' && map) {
                        // Listen for the draw:created event
                        map.on('draw:created', function(e) {
                            var layer = e.layer;
                            if (e.layerType === 'circle') {
                                // Call the handler function from circle_editor.js
                                handleNewCircle(layer);
                            }
                        });
                        
                        // Listen for the draw:edited event
                        map.on('draw:edited', function(e) {
                            var layers = e.layers;
                            layers.eachLayer(function(layer) {
                                // Find the circle ID from the DOM element
                                var circleElement = layer._path;
                                if (circleElement && circleElement.hasAttribute('data-circle-id')) {
                                    var circleId = circleElement.getAttribute('data-circle-id');
                                    
                                    // Get updated circle data
                                    fetch('/get-circle/' + circleId)
                                        .then(response => response.json())
                                        .then(circleData => {
                                            // Update with new coordinates and radius
                                            circleData.center = [layer.getLatLng().lat, layer.getLatLng().lng];
                                            circleData.radius = layer.getRadius();
                                            
                                            // Save the updated circle via API
                                            return fetch('/save-circle', {
                                                method: 'POST',
                                                headers: {'Content-Type': 'application/json'},
                                                body: JSON.stringify(circleData)
                                            });
                                        })
                                        .then(response => response.json())
                                        .catch(error => console.error('Error updating circle:', error));
                                }
                            });
                        });
                        
                        // Listen for the draw:deleted event
                        map.on('draw:deleted', function(e) {
                            var layers = e.layers;
                            layers.eachLayer(function(layer) {
                                // Find the circle ID from the DOM element
                                var circleElement = layer._path;
                                if (circleElement && circleElement.hasAttribute('data-circle-id')) {
                                    var circleId = circleElement.getAttribute('data-circle-id');
                                    
                                    // Delete the circle via API
                                    fetch('/delete-circle/' + circleId, {
                                        method: 'DELETE'
                                    }).catch(error => console.error('Error deleting circle:', error));
                                }
                            });
                        });
                    }
                }, 1000);
            });
        </script>
        """))

    # Add layer control
    folium.LayerControl().add_to(m)

    return m


if __name__ == "__main__":
    # For standalone usage, save the map to a file
    m = create_map()
    base_path = Path(__file__).parent.parent
    output_path = base_path / "web/static" / "map.html"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    m.save(str(output_path))
