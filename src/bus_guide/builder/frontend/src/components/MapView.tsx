import { FeatureCollection } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { memo, useCallback, useEffect, useState } from 'react';
import { CircleMarker, GeoJSON, Circle as LeafletCircle, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Article, Circle, Route } from '../services/api';

interface MapViewProps {
    articles: Article[];
    circles: Circle[];
    selectedCircle: Circle | null;
    selectedRoute: Route | null;
    routeData: any | null;
    onArticleClick: (article: Article) => void;
    onCircleClick: (circle: Circle) => void;
    onMapClick: (lat: number, lng: number) => void;
}

// Component to handle map center changes
const MapController = ({
    selectedCircle,
    selectedRoute,
    routeData
}: {
    selectedCircle: Circle | null;
    selectedRoute: Route | null;
    routeData: any | null;
}) => {
    const map = useMap();

    useEffect(() => {
        if (selectedCircle) {
            map.setView(selectedCircle.center, 14);
        } else if (routeData && routeData.features && routeData.features.length > 0) {
            // Try to fit map to route bounds
            try {
                const geoJsonLayer = L.geoJSON(routeData);
                const bounds = geoJsonLayer.getBounds();
                map.fitBounds(bounds);
            } catch (error) {
                console.error("Error fitting to route bounds:", error);
            }
        }
    }, [map, selectedCircle, selectedRoute, routeData]);

    return null;
};

// Component to handle map click events
const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
    const map = useMap();

    useEffect(() => {
        const handleClick = (e: L.LeafletMouseEvent) => {
            onClick(e.latlng.lat, e.latlng.lng);
        };

        map.on('click', handleClick);

        return () => {
            map.off('click', handleClick);
        };
    }, [map, onClick]);

    return null;
};

// Memoized map content component to prevent unnecessary re-renders
const MapContent = memo(({
    articles,
    circles,
    selectedCircle,
    selectedRoute,
    routeData,
    onArticleClick,
    onCircleClick,
    onMapClick
}: MapViewProps) => {
    // Article marker style
    const getMarkerStyle = useCallback((article: Article) => {
        // Check if article is part of selected circle
        const isInSelectedCircle = selectedCircle &&
            selectedCircle.articles?.includes(article.pageid);

        return {
            radius: 6,
            fillColor: isInSelectedCircle ? '#1976d2' : '#d32f2f',
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        };
    }, [selectedCircle]);

    // Styles for circles
    const getCircleStyle = useCallback((circle: Circle) => {
        const isSelected = selectedCircle && selectedCircle.id === circle.id;

        return {
            stroke: true,
            color: circle.color || '#1976d2',
            weight: isSelected ? 3 : 1,
            opacity: isSelected ? 0.9 : 0.5,
            fillColor: circle.color || '#1976d2',
            fillOpacity: isSelected ? 0.2 : 0.1
        };
    }, [selectedCircle]);

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController
                selectedCircle={selectedCircle}
                selectedRoute={selectedRoute}
                routeData={routeData}
            />

            <MapClickHandler onClick={onMapClick} />

            {/* Display circles */}
            {circles.map(circle => (
                <LeafletCircle
                    key={circle.id}
                    center={circle.center}
                    radius={circle.radius}
                    pathOptions={getCircleStyle(circle)}
                    eventHandlers={{
                        click: () => onCircleClick(circle)
                    }}
                >
                    <Popup>
                        <div>
                            <strong>{circle.name}</strong>
                            <p>Radius: {circle.radius}m</p>
                            <p>Articles: {circle.articles?.length || 0}</p>
                        </div>
                    </Popup>
                </LeafletCircle>
            ))}

            {/* Display article markers */}
            {articles.map(article => (
                <CircleMarker
                    key={article.pageid}
                    center={[article.lat, article.lon]}
                    pathOptions={getMarkerStyle(article)}
                    eventHandlers={{
                        click: () => onArticleClick(article)
                    }}
                >
                    <Popup>
                        <div className="article-marker-popup">
                            <div className="article-title">{article.title}</div>
                            <div>
                                <a href={`https://${article.lang}.wikipedia.org/wiki/${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer">
                                    Open Wikipedia Article
                                </a>
                            </div>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}

            {/* Display route if selected and data is available */}
            {routeData && (
                <GeoJSON
                    data={routeData as FeatureCollection}
                    style={() => ({
                        color: '#3388ff',
                        weight: 4,
                        opacity: 0.6
                    })}
                />
            )}
        </>
    );
});

// The main map component that only renders once
const MapView = (props: MapViewProps) => {
    // Berlin coordinates
    const berlinPosition: [number, number] = [52.5200, 13.4050];

    // Using state to ensure we only render MapContainer once
    const [mapInitialized, setMapInitialized] = useState(false);

    return (
        <div className="map-wrapper" style={{ height: '100%', width: '100%' }}>
            {!mapInitialized ? (
                <MapContainer
                    center={berlinPosition}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    whenCreated={() => {
                        setMapInitialized(true);
                    }}
                >
                    <MapContent {...props} />
                </MapContainer>
            ) : (
                <MapContainer
                    center={berlinPosition}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    key="map-initialized"
                >
                    <MapContent {...props} />
                </MapContainer>
            )}
        </div>
    );
};

export default MapView; 