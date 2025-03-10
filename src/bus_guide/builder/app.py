import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

app = FastAPI(title="Berlin Bus Guide")

# Mount static directory
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Set up templates
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

# Path for storing user circles
circles_path = Path(__file__).parent.parent / "data" / "user_circles.json"

# Routes directory
routes_path = Path(__file__).parent.parent / "routes"


# Model for circle data
class Circle(BaseModel):
    id: str
    name: str
    center: List[float]
    radius: float
    color: str
    articles: Optional[List[int]] = []


# Model for article operations
class ArticleOperation(BaseModel):
    article_id: int


class Article(BaseModel):
    pageid: int
    ns: int
    title: str
    lat: float
    lon: float
    dist: float
    primary: str
    lang: str


def load_circles() -> List[Dict[str, Any]]:
    if not circles_path.exists():
        return []
    try:
        with open(circles_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []


def save_circles(circles: List[Dict[str, Any]]) -> None:
    circles_path.parent.mkdir(parents=True, exist_ok=True)
    with open(circles_path, "w", encoding="utf-8") as f:
        json.dump(circles, f, ensure_ascii=False, indent=2)


@app.get("/api/articles", response_model=List[Article])
async def get_articles():
    """Retrieve all articles"""
    articles_path = Path(__file__).parent.parent / "data" / "articles.json"
    with open(articles_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/circles", response_model=List[Circle])
async def get_circles():
    """Retrieve all user circles"""
    return load_circles()


@app.get("/api/circles/{circle_id}", response_model=Circle)
async def get_circle(circle_id: str):
    """Retrieve a specific circle by ID"""
    circles = load_circles()
    for circle in circles:
        if circle["id"] == circle_id:
            return circle
    raise HTTPException(status_code=404, detail="Circle not found")


@app.post("/api/circles", status_code=201)
async def create_circle(circle: Circle):
    """Create a new circle"""
    circles = load_circles()

    # Check if circle with this ID already exists
    for existing_circle in circles:
        if existing_circle["id"] == circle.id:
            raise HTTPException(
                status_code=409, detail="Circle with this ID already exists"
            )

    # Add new circle
    circles.append(circle.dict())
    save_circles(circles)
    return {"id": circle.id, "status": "created"}


@app.put("/api/circles/{circle_id}")
async def update_circle(circle_id: str, circle: Circle):
    """Update an existing circle"""
    if circle_id != circle.id:
        raise HTTPException(
            status_code=400, detail="Circle ID in URL must match circle ID in body"
        )

    circles = load_circles()
    found = False

    for i, existing_circle in enumerate(circles):
        if existing_circle["id"] == circle_id:
            circles[i] = circle.dict()
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Circle not found")

    save_circles(circles)
    return {"id": circle_id, "status": "updated"}


@app.delete("/api/circles/{circle_id}")
async def delete_circle(circle_id: str):
    """Delete a circle by ID"""
    circles = load_circles()
    initial_count = len(circles)
    circles = [circle for circle in circles if circle["id"] != circle_id]

    if len(circles) == initial_count:
        raise HTTPException(status_code=404, detail="Circle not found")

    save_circles(circles)
    return {"id": circle_id, "status": "deleted"}


# RESTful API endpoints for circle articles


@app.delete("/api/circles/{circle_id}/articles/{article_id}")
async def remove_article_from_circle(circle_id: str, article_id: int):
    """Remove an article from a circle"""
    circles = load_circles()
    circle_found = False

    for i, circle in enumerate(circles):
        if circle["id"] == circle_id:
            circle_found = True
            # Convert articles to integers if they're strings
            if "articles" in circle:
                circle["articles"] = [
                    int(a) if isinstance(a, str) else a for a in circle["articles"]
                ]
                # Remove the article
                if article_id in circle["articles"]:
                    circle["articles"].remove(article_id)
                    circles[i] = circle
                    save_circles(circles)
                    return {
                        "circle_id": circle_id,
                        "article_id": article_id,
                        "status": "removed",
                    }
                else:
                    raise HTTPException(
                        status_code=404, detail="Article not found in circle"
                    )

    if not circle_found:
        raise HTTPException(status_code=404, detail="Circle not found")


@app.post("/api/circles/{circle_id}/articles")
async def add_article_to_circle(circle_id: str, article: ArticleOperation):
    """Add an article to a circle"""
    circles = load_circles()
    circle_found = False

    for i, circle in enumerate(circles):
        if circle["id"] == circle_id:
            circle_found = True

            # Initialize articles array if it doesn't exist
            if "articles" not in circle:
                circle["articles"] = []

            # Convert articles to integers if they're strings
            circle["articles"] = [
                int(a) if isinstance(a, str) else a for a in circle["articles"]
            ]

            # Check if article already exists in the circle
            if article.article_id in circle["articles"]:
                return {
                    "circle_id": circle_id,
                    "article_id": article.article_id,
                    "status": "already_exists",
                }

            # Add the article
            circle["articles"].append(article.article_id)
            circles[i] = circle
            save_circles(circles)
            return {
                "circle_id": circle_id,
                "article_id": article.article_id,
                "status": "added",
            }

    if not circle_found:
        raise HTTPException(status_code=404, detail="Circle not found")


@app.get("/api/routes/{route_id}")
async def get_route(route_id: str):
    """Retrieve GeoJSON data for a specific route"""
    route_file = routes_path / f"bus{route_id}.geojson"

    if not route_file.exists():
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")

    try:
        with open(route_file, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)
        return geojson_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parsing route data")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading route data: {str(e)}"
        )


@app.get("/api/routes")
async def list_routes():
    """List all available routes"""
    if not routes_path.exists():
        return []

    try:
        route_files = list(routes_path.glob("bus*.geojson"))
        routes = []

        for route_file in route_files:
            route_id = route_file.stem.replace("bus", "")
            with open(route_file, "r", encoding="utf-8") as f:
                geojson_data = json.load(f)

                # Extract basic route information if available
                route_info = {"id": route_id, "file": route_file.name}

                # Try to extract name from the first feature's properties
                if geojson_data.get("features") and len(geojson_data["features"]) > 0:
                    properties = geojson_data["features"][0].get("properties", {})
                    if "name" in properties:
                        route_info["name"] = properties["name"]
                    if "ref" in properties:
                        route_info["ref"] = properties["ref"]
                    if "from" in properties and "to" in properties:
                        route_info["from"] = properties["from"]
                        route_info["to"] = properties["to"]

                routes.append(route_info)

        return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing routes: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)
