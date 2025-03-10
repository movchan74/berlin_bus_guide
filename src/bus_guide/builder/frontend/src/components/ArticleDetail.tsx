import { useState } from 'react';
import { Article, Circle } from '../services/api';

interface ArticleDetailProps {
    article: Article | null;
    circles: Circle[];
    onAddToCircle: (circleId: string, articleId: number) => void;
    onClose: () => void;
}

const ArticleDetail = ({
    article,
    circles,
    onAddToCircle,
    onClose
}: ArticleDetailProps) => {
    const [selectedCircleId, setSelectedCircleId] = useState<string>('');

    if (!article) return null;

    // Get nearby circles - could be enhanced to actually calculate distance
    const nearbyCircles = circles.filter(circle => {
        const distance = getDistanceFromLatLonInM(
            circle.center[0],
            circle.center[1],
            article.lat,
            article.lon
        );
        return distance <= circle.radius;
    });

    // Calculate distance between two points in meters
    function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371000; // Radius of the earth in m
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in m
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    // Handle adding article to selected circle
    const handleAddToCircle = () => {
        if (!selectedCircleId) {
            alert('Please select a circle');
            return;
        }

        onAddToCircle(selectedCircleId, article.pageid);
        setSelectedCircleId('');
    };

    return (
        <div className="article-detail">
            <h2>{article.title}</h2>

            <div className="article-info">
                <p>
                    <strong>Coordinates:</strong> {article.lat}, {article.lon}
                </p>
                <p>
                    <a
                        href={`https://${article.lang}.wikipedia.org/wiki/${encodeURIComponent(article.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open in Wikipedia
                    </a>
                </p>
            </div>

            <div className="circle-selector">
                <h3>Add to Circle</h3>

                {circles.length > 0 ? (
                    <>
                        <div className="form-group">
                            <select
                                value={selectedCircleId}
                                onChange={(e) => setSelectedCircleId(e.target.value)}
                            >
                                <option value="">Select a circle</option>
                                {circles.map(circle => (
                                    <option
                                        key={circle.id}
                                        value={circle.id}
                                    >
                                        {circle.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="button"
                            onClick={handleAddToCircle}
                            disabled={!selectedCircleId}
                        >
                            Add to Circle
                        </button>
                    </>
                ) : (
                    <p>No circles available</p>
                )}
            </div>

            {nearbyCircles.length > 0 && (
                <div className="nearby-circles">
                    <h3>Nearby Circles</h3>
                    <ul className="circle-list">
                        {nearbyCircles.map(circle => (
                            <li
                                key={circle.id}
                                className="circle-item"
                                onClick={() => setSelectedCircleId(circle.id)}
                            >
                                {circle.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="controls">
                <button className="button secondary" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default ArticleDetail; 