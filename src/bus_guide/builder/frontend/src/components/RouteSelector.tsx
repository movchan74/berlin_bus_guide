import { Route } from '../services/api';

interface RouteSelectorProps {
    routes: Route[];
    selectedRoute: Route | null;
    onSelectRoute: (route: Route | null) => void;
}

const RouteSelector = ({
    routes,
    selectedRoute,
    onSelectRoute
}: RouteSelectorProps) => {
    return (
        <div className="route-selector">
            <h3>Bus Routes</h3>

            <div className="form-group">
                <select
                    value={selectedRoute?.id || ''}
                    onChange={(e) => {
                        const routeId = e.target.value;
                        if (!routeId) {
                            onSelectRoute(null);
                            return;
                        }

                        const route = routes.find(r => r.id === routeId) || null;
                        onSelectRoute(route);
                    }}
                >
                    <option value="">Select a route</option>
                    {routes.map(route => (
                        <option key={route.id} value={route.id}>
                            Bus {route.id} {route.from && route.to ? `(${route.from} - ${route.to})` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {selectedRoute && (
                <div className="route-info">
                    <p>
                        <strong>Bus Line:</strong> {selectedRoute.id}
                    </p>
                    {selectedRoute.from && selectedRoute.to && (
                        <p>
                            <strong>Route:</strong> {selectedRoute.from} - {selectedRoute.to}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default RouteSelector; 