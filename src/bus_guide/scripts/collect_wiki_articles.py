import json
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import requests
from tqdm import tqdm


def load_geojson(file_path: str) -> Dict[str, Any]:
    """Load GeoJSON file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_coordinates(
    geojson: Dict[str, Any], sample_distance: float = 0.0001
) -> List[Tuple[float, float]]:
    """
    Extract coordinates from GeoJSON features.
    Args:
        geojson: The GeoJSON data
        sample_distance: Distance between sampled points (in degrees, roughly 100m)
    """
    coordinates = set()

    for feature in geojson["features"]:
        # Always include bus stops
        if feature["geometry"]["type"] == "Point":
            coord = tuple(feature["geometry"]["coordinates"])
            coordinates.add(coord)
        # Sample points along the route
        elif feature["geometry"]["type"] == "MultiLineString":
            for line in feature["geometry"]["coordinates"]:
                # Sample points at regular intervals
                # for i in range(0, len(line), int(1 / sample_distance)):
                for i in range(0, len(line)):
                    coord = tuple(line[i])
                    coordinates.add(coord)

    return list(coordinates)


def get_wikipedia_articles(
    lat: float, lon: float, radius: int = 200, language: str = "en"
) -> List[Dict[str, Any]]:
    """
    Get Wikipedia articles near the specified coordinates.
    Args:
        lat: Latitude
        lon: Longitude
        radius: Search radius in meters (increased to cover gaps between sampled points)
        language: Wikipedia language code ('en' or 'de')
    """
    endpoint = f"https://{language}.wikipedia.org/w/api.php"

    params = {
        "action": "query",
        "format": "json",
        "list": "geosearch",
        "gscoord": f"{lat}|{lon}",
        "gsradius": radius,
        "gslimit": 10,
    }

    try:
        response = requests.get(endpoint, params=params)
        response.raise_for_status()
        data = response.json()
        articles = data["query"]["geosearch"]
        # Add language tag to each article
        for article in articles:
            article["lang"] = language
        return articles
    except Exception as e:
        print(f"Error fetching {language} articles for coordinates {lat}, {lon}: {e}")
        return []


def main():
    # Setup paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    input_file = project_root / "routes" / "bus100.geojson"
    output_file = project_root / "data" / "wiki_articles.json"

    # Create data directory if it doesn't exist
    output_file.parent.mkdir(exist_ok=True)

    # Load GeoJSON and sample coordinates
    geojson = load_geojson(input_file)
    coordinates = extract_coordinates(
        geojson, sample_distance=0.1
    )  # About 100m between points

    # Collect articles
    all_articles = []

    # Add progress bar
    print("Collecting Wikipedia articles...")
    for lon, lat in tqdm(coordinates, desc="Processing coordinates"):
        # Get both English and German articles
        for lang in ["en", "de"]:
            articles = get_wikipedia_articles(lat, lon, language=lang)
            if articles:
                all_articles.extend(articles)
            # Add a small delay to avoid hitting API rate limits
            time.sleep(0.1)

    # Remove duplicates based on pageid and language, keeping minimum distance
    unique_articles = {}
    for article in all_articles:
        key = f"{article['pageid']}_{article['lang']}"
        if key not in unique_articles or article["dist"] < unique_articles[key]["dist"]:
            unique_articles[key] = article

    # Save results
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(list(unique_articles.values()), f, indent=2, ensure_ascii=False)

    print(f"Collected {len(unique_articles)} unique articles")


if __name__ == "__main__":
    main()
