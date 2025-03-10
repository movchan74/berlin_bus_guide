import { useEffect, useState } from 'react';
import './App.css';
import ArticleDetail from './components/ArticleDetail';
import CircleManager from './components/CircleManager';
import MapView from './components/MapView';
import RouteSelector from './components/RouteSelector';
import api, { Article, Circle, Route } from './services/api';

function App() {
  // Application state
  const [articles, setArticles] = useState<Article[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeData, setRouteData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel
        const [articlesData, circlesData, routesData] = await Promise.all([
          api.getArticles(),
          api.getCircles(),
          api.getRoutes()
        ]);

        setArticles(articlesData);
        setCircles(circlesData);
        setRoutes(routesData);
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch route data when selected route changes
  useEffect(() => {
    if (!selectedRoute) {
      setRouteData(null);
      return;
    }

    const fetchRouteData = async () => {
      try {
        const data = await api.getRoute(selectedRoute.id);
        setRouteData(data);
      } catch (err) {
        console.error('Error loading route data:', err);
        setError(`Failed to load route ${selectedRoute.id}`);
      }
    };

    fetchRouteData();
  }, [selectedRoute]);

  // Handle creating a new circle
  const handleCreateCircle = async (circle: Circle) => {
    try {
      await api.createCircle(circle);
      // Reload circles
      const updatedCircles = await api.getCircles();
      setCircles(updatedCircles);
      setSelectedCircle(circle);
    } catch (err) {
      console.error('Error creating circle:', err);
      alert('Failed to create circle');
    }
  };

  // Handle updating a circle
  const handleUpdateCircle = async (circle: Circle) => {
    try {
      await api.updateCircle(circle.id, circle);
      // Reload circles
      const updatedCircles = await api.getCircles();
      setCircles(updatedCircles);
      setSelectedCircle(circle);
    } catch (err) {
      console.error('Error updating circle:', err);
      alert('Failed to update circle');
    }
  };

  // Handle deleting a circle
  const handleDeleteCircle = async (circleId: string) => {
    try {
      await api.deleteCircle(circleId);
      // Reload circles
      const updatedCircles = await api.getCircles();
      setCircles(updatedCircles);
      setSelectedCircle(null);
    } catch (err) {
      console.error('Error deleting circle:', err);
      alert('Failed to delete circle');
    }
  };

  // Handle adding an article to a circle
  const handleAddArticleToCircle = async (circleId: string, articleId: number) => {
    try {
      await api.addArticleToCircle(circleId, articleId);
      // Reload circles
      const updatedCircles = await api.getCircles();
      setCircles(updatedCircles);

      // Update selected circle if it's the one we modified
      if (selectedCircle && selectedCircle.id === circleId) {
        const updatedCircle = updatedCircles.find(c => c.id === circleId) || null;
        setSelectedCircle(updatedCircle);
      }

      // Show feedback
      alert(`Article "${selectedArticle?.title}" added to circle`);
    } catch (err) {
      console.error('Error adding article to circle:', err);
      alert('Failed to add article to circle');
    }
  };

  // Handle removing an article from a circle
  const handleRemoveArticleFromCircle = async (circleId: string, articleId: number) => {
    try {
      await api.removeArticleFromCircle(circleId, articleId);
      // Reload circles
      const updatedCircles = await api.getCircles();
      setCircles(updatedCircles);

      // Update selected circle if it's the one we modified
      if (selectedCircle && selectedCircle.id === circleId) {
        const updatedCircle = updatedCircles.find(c => c.id === circleId) || null;
        setSelectedCircle(updatedCircle);
      }
    } catch (err) {
      console.error('Error removing article from circle:', err);
      alert('Failed to remove article from circle');
    }
  };

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    // Update circle center if editing
    if (selectedCircle) {
      const updatedCircle = { ...selectedCircle, center: [lat, lng] as [number, number] };
      setSelectedCircle(updatedCircle);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Berlin Bus Guide Builder</h1>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <RouteSelector
            routes={routes}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
          />

          <CircleManager
            circles={circles}
            selectedCircle={selectedCircle}
            articles={articles}
            onSelectCircle={setSelectedCircle}
            onCreateCircle={handleCreateCircle}
            onUpdateCircle={handleUpdateCircle}
            onDeleteCircle={handleDeleteCircle}
            onRemoveArticle={handleRemoveArticleFromCircle}
          />
        </div>

        <div className="map-container">
          <MapView
            articles={articles}
            circles={circles}
            selectedCircle={selectedCircle}
            selectedRoute={selectedRoute}
            routeData={routeData}
            onArticleClick={setSelectedArticle}
            onCircleClick={setSelectedCircle}
            onMapClick={handleMapClick}
          />

          {selectedArticle && (
            <div className="article-detail-overlay">
              <ArticleDetail
                article={selectedArticle}
                circles={circles}
                onAddToCircle={handleAddArticleToCircle}
                onClose={() => setSelectedArticle(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
