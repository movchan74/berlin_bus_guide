import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from bus_guide.web.map.visualize import create_map

app = FastAPI(title="Berlin Bus Guide")

# Mount static directory
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Set up templates
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

# Path for storing user circles
circles_path = Path(__file__).parent.parent / "data" / "user_circles.json"


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


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    # Save map HTML to a file
    m = create_map()
    map_path = static_path / "map.html"
    m.save(str(map_path))

    return templates.TemplateResponse(
        "index.html", {"request": request, "map_url": "/static/map.html"}
    )


@app.get("/editor", response_class=HTMLResponse)
async def editor(request: Request):
    # Save map HTML to a file with editor mode enabled
    m = create_map(edit_mode=True)
    map_path = static_path / "editor_map.html"
    m.save(str(map_path))

    return templates.TemplateResponse(
        "editor.html", {"request": request, "map_url": "/static/editor_map.html"}
    )


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


# RESTful API endpoints for circles

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
            raise HTTPException(status_code=409, detail="Circle with this ID already exists")
    
    # Add new circle
    circles.append(circle.dict())
    save_circles(circles)
    return {"id": circle.id, "status": "created"}


@app.put("/api/circles/{circle_id}")
async def update_circle(circle_id: str, circle: Circle):
    """Update an existing circle"""
    if circle_id != circle.id:
        raise HTTPException(status_code=400, detail="Circle ID in URL must match circle ID in body")
        
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
                    return {"circle_id": circle_id, "article_id": article_id, "status": "removed"}
                else:
                    raise HTTPException(status_code=404, detail="Article not found in circle")

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
                return {"circle_id": circle_id, "article_id": article.article_id, "status": "already_exists"}
                
            # Add the article
            circle["articles"].append(article.article_id)
            circles[i] = circle
            save_circles(circles)
            return {"circle_id": circle_id, "article_id": article.article_id, "status": "added"}

    if not circle_found:
        raise HTTPException(status_code=404, detail="Circle not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)
