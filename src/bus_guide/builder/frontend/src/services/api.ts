import axios from 'axios';

// Types matching the backend models
export interface Article {
    pageid: number;
    ns: number;
    title: string;
    lat: number;
    lon: number;
    dist: number;
    primary: string;
    lang: string;
}

export interface Circle {
    id: string;
    name: string;
    center: [number, number];
    radius: number;
    color: string;
    articles?: number[];
}

export interface Route {
    id: string;
    name?: string;
    ref?: string;
    from?: string;
    to?: string;
    file?: string;
}

// API client
const api = {
    // Articles
    getArticles: async (): Promise<Article[]> => {
        const response = await axios.get('/api/articles');
        return response.data;
    },

    // Circles
    getCircles: async (): Promise<Circle[]> => {
        const response = await axios.get('/api/circles');
        return response.data;
    },

    getCircle: async (id: string): Promise<Circle> => {
        const response = await axios.get(`/api/circles/${id}`);
        return response.data;
    },

    createCircle: async (circle: Circle): Promise<{ id: string; status: string }> => {
        const response = await axios.post('/api/circles', circle);
        return response.data;
    },

    updateCircle: async (id: string, circle: Circle): Promise<{ id: string; status: string }> => {
        const response = await axios.put(`/api/circles/${id}`, circle);
        return response.data;
    },

    deleteCircle: async (id: string): Promise<{ id: string; status: string }> => {
        const response = await axios.delete(`/api/circles/${id}`);
        return response.data;
    },

    // Articles in circles
    addArticleToCircle: async (circleId: string, articleId: number): Promise<{ circle_id: string; article_id: number; status: string }> => {
        const response = await axios.post(`/api/circles/${circleId}/articles`, { article_id: articleId });
        return response.data;
    },

    removeArticleFromCircle: async (circleId: string, articleId: number): Promise<{ circle_id: string; article_id: number; status: string }> => {
        const response = await axios.delete(`/api/circles/${circleId}/articles/${articleId}`);
        return response.data;
    },

    // Routes
    getRoutes: async (): Promise<Route[]> => {
        const response = await axios.get('/api/routes');
        return response.data;
    },

    getRoute: async (id: string): Promise<any> => {
        const response = await axios.get(`/api/routes/${id}`);
        return response.data;
    }
};

export default api; 