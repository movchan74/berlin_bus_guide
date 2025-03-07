from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from bus_guide.web.map.visualize import create_map

app = FastAPI(title="Berlin Bus Guide")

# Mount static directory
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Set up templates
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    # Save map HTML to a file
    m = create_map()
    map_path = static_path / "map.html"
    m.save(str(map_path))
    
    return templates.TemplateResponse(
        "index.html", 
        {
            "request": request,
            "map_url": "/static/map.html"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
