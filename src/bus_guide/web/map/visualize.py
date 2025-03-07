import json
from pathlib import Path
from urllib.parse import quote
import random

import folium
from folium.plugins import GroupedLayerControl, MarkerCluster


def load_json_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def create_map():
    # Load data
    base_path = Path(__file__).parent.parent.parent
    bus_route = load_json_file(base_path / "routes/bus100.geojson")
    wiki_articles = load_json_file(base_path / "data/wiki_articles.json")

    # Create map centered on Berlin
    m = folium.Map(
        location=[52.52, 13.38],  # Berlin center coordinates
        zoom_start=13,
        tiles="OpenStreetMap",
    )

    # Create feature groups for different languages
    articles_en = folium.FeatureGroup(name="Points of Interest (EN)", show=True)
    articles_de = folium.FeatureGroup(name="Sehenswürdigkeiten (DE)", show=False)

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
    
    # Add Wikipedia articles as markers
    for article in wiki_articles:
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

        popup_html = f"""
            <b>{article["title"]}</b><br>
            <a href="{wiki_url}" target="_blank">{"Auf Wikipedia lesen" if lang == "de" else "Read on Wikipedia"}</a>
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

    # Add the feature groups to the map
    articles_en.add_to(m)
    articles_de.add_to(m)

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
