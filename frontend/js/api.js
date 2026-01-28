// API Base URL
const API_BASE = '/api';

// Fetch helper
async function fetchAPI(endpoint, params = {}) {
    let url = `${API_BASE}${endpoint}`;
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
        url += '?' + queryString;
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Rechercher des cartes
async function searchCardsAPI(query) {
    return fetchAPI('/search-cards', { q: query });
}

// Rechercher par archétype
async function searchByArchetype(archetype) {
    return fetchAPI('/search-cards', { archtype: archetype });
}

// Récupérer les infos d'une carte
async function getCardInfoAPI(cardID) {
    return fetchAPI('/card-info', { id: cardID });
}

// Récupérer les archétypes
async function getArchetypesAPI() {
    return fetchAPI('/archetypes');
}

// Récupérer la banlist
async function getBanlistAPI(format = 'TCG') {
    return fetchAPI('/banlist', { format });
}

// Récupérer les top decks
async function getTopDecksAPI() {
    return fetchAPI('/top-decks');
}

// Récupérer les decks contenant une carte
async function getDecksByCardAPI(cardName) {
    return fetchAPI('/decks-by-card', { card: cardName });
}
