import { useEffect, useState } from 'react';
import { Article, Circle } from '../services/api';

interface CircleManagerProps {
    circles: Circle[];
    selectedCircle: Circle | null;
    articles: Article[];
    onSelectCircle: (circle: Circle | null) => void;
    onCreateCircle: (circle: Circle) => void;
    onUpdateCircle: (circle: Circle) => void;
    onDeleteCircle: (circleId: string) => void;
    onRemoveArticle: (circleId: string, articleId: number) => void;
}

const CircleManager = ({
    circles,
    selectedCircle,
    articles,
    onSelectCircle,
    onCreateCircle,
    onUpdateCircle,
    onDeleteCircle,
    onRemoveArticle
}: CircleManagerProps) => {
    // Local form state
    const [formValues, setFormValues] = useState<Partial<Circle>>({
        id: '',
        name: '',
        center: [52.52, 13.405],
        radius: 500,
        color: '#1976d2'
    });

    // Empty/New circle template
    const emptyCircle: Partial<Circle> = {
        id: '',
        name: '',
        center: [52.52, 13.405],
        radius: 500,
        color: '#1976d2'
    };

    // Reset form when selected circle changes
    useEffect(() => {
        if (selectedCircle) {
            setFormValues({ ...selectedCircle });
        } else {
            setFormValues({ ...emptyCircle });
        }
    }, [selectedCircle]);

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'center') {
            // Parse center coordinates from comma-separated input
            try {
                const [lat, lng] = value.split(',').map(val => parseFloat(val.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    setFormValues({ ...formValues, center: [lat, lng] });
                }
            } catch (error) {
                console.error('Invalid center format:', error);
            }
        } else if (name === 'radius') {
            setFormValues({ ...formValues, radius: parseFloat(value) });
        } else {
            setFormValues({ ...formValues, [name]: value });
        }
    };

    // Create or update circle
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!formValues.id || !formValues.name || !formValues.center || !formValues.radius) {
            alert('Please fill all required fields');
            return;
        }

        // Create circle object
        const circleData: Circle = {
            id: formValues.id!,
            name: formValues.name!,
            center: formValues.center as [number, number],
            radius: formValues.radius!,
            color: formValues.color || '#1976d2',
            articles: formValues.articles || []
        };

        // Update or create
        if (selectedCircle) {
            onUpdateCircle(circleData);
        } else {
            onCreateCircle(circleData);
        }
    };

    // New circle button
    const handleNewCircle = () => {
        onSelectCircle(null);
        setFormValues({ ...emptyCircle });
    };

    // Delete circle
    const handleDeleteCircle = () => {
        if (selectedCircle && window.confirm(`Are you sure you want to delete "${selectedCircle.name}"?`)) {
            onDeleteCircle(selectedCircle.id);
        }
    };

    // Get articles in selected circle
    const getCircleArticles = () => {
        if (!selectedCircle || !selectedCircle.articles || selectedCircle.articles.length === 0) {
            return [];
        }

        return articles.filter(article =>
            selectedCircle.articles?.includes(article.pageid)
        );
    };

    // Format center coordinates for display
    const formatCenter = (center: [number, number] | undefined) => {
        if (!center) return '';
        return `${center[0]}, ${center[1]}`;
    };

    const circleArticles = getCircleArticles();

    return (
        <div className="circle-manager">
            <h2>Circle Management</h2>

            <div className="controls">
                <button className="button" onClick={handleNewCircle}>New Circle</button>
            </div>

            <div className="circle-list-container">
                <h3>Circles</h3>
                <ul className="circle-list">
                    {circles.map(circle => (
                        <li
                            key={circle.id}
                            className={`circle-item ${selectedCircle?.id === circle.id ? 'selected' : ''}`}
                            onClick={() => onSelectCircle(circle)}
                        >
                            <div className="circle-name">{circle.name}</div>
                            <div className="circle-stats">
                                Articles: {circle.articles?.length || 0}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <form onSubmit={handleSubmit}>
                <h3>{selectedCircle ? 'Edit Circle' : 'Create Circle'}</h3>

                <div className="form-group">
                    <label htmlFor="id">ID</label>
                    <input
                        type="text"
                        id="id"
                        name="id"
                        value={formValues.id || ''}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formValues.name || ''}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="center">Center (lat, lng)</label>
                    <input
                        type="text"
                        id="center"
                        name="center"
                        value={formatCenter(formValues.center)}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="radius">Radius (meters)</label>
                    <input
                        type="number"
                        id="radius"
                        name="radius"
                        value={formValues.radius || 500}
                        onChange={handleInputChange}
                        min="100"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="color">Color</label>
                    <input
                        type="color"
                        id="color"
                        name="color"
                        value={formValues.color || '#1976d2'}
                        onChange={handleInputChange}
                    />
                </div>

                <div className="controls">
                    <button type="submit" className="button">
                        {selectedCircle ? 'Update Circle' : 'Create Circle'}
                    </button>

                    {selectedCircle && (
                        <button type="button" className="button danger" onClick={handleDeleteCircle}>
                            Delete Circle
                        </button>
                    )}
                </div>
            </form>

            {selectedCircle && (
                <div className="circle-articles">
                    <h3>Articles in Circle</h3>

                    {circleArticles.length > 0 ? (
                        <div className="articles-list">
                            {circleArticles.map(article => (
                                <div key={article.pageid} className="article-item">
                                    <div>{article.title}</div>
                                    <button
                                        className="button secondary"
                                        onClick={() => onRemoveArticle(selectedCircle.id, article.pageid)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No articles in this circle</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default CircleManager; 