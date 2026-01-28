// Configuration
const API_BASE = 'https://db.ygoprodeck.com/api/v7';
const BACKEND_API = 'http://localhost:8080/api';
const DOM = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    randomBtn: document.getElementById('randomBtn'),
    typeFilter: document.getElementById('typeFilter'),
    attributeFilter: document.getElementById('attributeFilter'),
    levelFilter: document.getElementById('levelFilter'),
    raceFilter: document.getElementById('raceFilter'),
    banlistFilter: document.getElementById('banlistFilter'),
    resetBtn: document.getElementById('resetBtn'),
    cardsGrid: document.getElementById('cardsGrid'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    resultCount: document.getElementById('resultCount'),
    modal: document.getElementById('cardModal'),
    modalClose: document.querySelector('.modal-close'),
    modalImage: document.getElementById('modalImage'),
    modalName: document.getElementById('modalName'),
    modalDetails: document.getElementById('modalDetails'),
    modalSets: document.getElementById('modalSets'),
    decksList: document.getElementById('decksList'),
    deckModal: document.getElementById('deckModal'),
};

let allCards = [];
let filteredCards = [];

// Événements
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Recherche
    DOM.searchBtn.addEventListener('click', search);
    DOM.searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && search());
    
    // Filtres
    DOM.typeFilter.addEventListener('change', applyFilters);
    DOM.attributeFilter.addEventListener('change', applyFilters);
    DOM.levelFilter.addEventListener('change', applyFilters);
    DOM.raceFilter.addEventListener('change', applyFilters);
    DOM.banlistFilter.addEventListener('change', applyFilters);
    DOM.resetBtn.addEventListener('click', resetFilters);
    
    // Aléatoire
    DOM.randomBtn.addEventListener('click', searchRandom);
    
    // Modal
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modal.addEventListener('click', (e) => e.target === DOM.modal && closeModal());
    
    // Modal deck - Ajouter les event listeners dynamiquement pour les boutons close
    if (DOM.deckModal) {
        DOM.deckModal.addEventListener('click', (e) => {
            if (e.target === DOM.deckModal || e.target.classList.contains('modal-close')) {
                closeModal();
            }
        });
    }
    
    // Charger quelques cartes par défaut
    loadDefaultCards();
    
    // Charger les decks officiels
    loadTopDecks();
}

// Charger cartes par défaut (pour ne pas avoir un écran vide)
async function loadDefaultCards() {
    try {
        showLoading(true);
        showError('');
        const response = await fetch(`${API_BASE}/cardinfo.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            allCards = data.data.slice(0, 20);
            filteredCards = [...allCards];
            displayCards(filteredCards);
            updateResultCount();
        } else {
            showError('Aucune carte disponible actuellement');
        }
    } catch (err) {
        console.error('Erreur chargement:', err);
        showError('Erreur lors du chargement des cartes: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// Rechercher des cartes
async function search() {
    const query = DOM.searchInput.value.trim();
    
    if (!query) {
        showError('Veuillez entrer un nom de carte');
        return;
    }
    
    try {
        showLoading(true);
        showError('');
        
        // YGOProDeck utilise 'fname' pour fuzzy name search
        const response = await fetch(`${API_BASE}/cardinfo.php?fname=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            allCards = data.data;
            filteredCards = [...allCards];
            displayCards(filteredCards);
            updateResultCount();
        } else {
            allCards = [];
            filteredCards = [];
            showError(`Aucune carte trouvée pour "${query}"`);
            displayCards([]);
            updateResultCount();
        }
    } catch (err) {
        console.error('Erreur recherche:', err);
        allCards = [];
        filteredCards = [];
        showError('Erreur lors de la recherche: ' + err.message);
        displayCards([]);
    } finally {
        showLoading(false);
    }
}

// Rechercher une carte aléatoire
async function searchRandom() {
    try {
        showLoading(true);
        showError('');
        
        // Obtenir un ID aléatoire (les IDs vont jusqu'à environ 100000)
        const randomId = Math.floor(Math.random() * 15000) + 1;
        
        const response = await fetch(`${API_BASE}/cardinfo.php?id=${randomId}`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const card = data.data[0];
            showCardDetails(card);
        } else {
            // Réessayer avec un autre ID
            searchRandom();
        }
    } catch (err) {
        showError('Erreur lors de la recherche aléatoire: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// Appliquer les filtres
function applyFilters() {
    const type = DOM.typeFilter.value;
    const attribute = DOM.attributeFilter.value;
    const level = DOM.levelFilter.value;
    const race = DOM.raceFilter.value;
    const banlist = DOM.banlistFilter.value;
    
    filteredCards = allCards.filter(card => {
        if (type && !card.type.includes(type)) return false;
        if (attribute && card.attribute !== attribute) return false;
        if (level && card.level && card.level.toString() !== level) return false;
        if (race && card.race !== race) return false;
        if (banlist && card.banlist_info) {
            const hasBanlist = card.banlist_info.some(info => 
                (banlist === 'TCG' && info.ban_tcg) || 
                (banlist === 'OCG' && info.ban_ocg)
            );
            if (!hasBanlist) return false;
        }
        return true;
    });
    
    displayCards(filteredCards);
    updateResultCount();
}

// Réinitialiser les filtres
function resetFilters() {
    DOM.typeFilter.value = '';
    DOM.attributeFilter.value = '';
    DOM.levelFilter.value = '';
    DOM.raceFilter.value = '';
    DOM.banlistFilter.value = '';
    DOM.searchInput.value = '';
    
    filteredCards = [...allCards];
    displayCards(filteredCards);
    updateResultCount();
}

// Afficher les cartes
function displayCards(cards) {
    DOM.cardsGrid.innerHTML = '';
    
    if (cards.length === 0) {
        DOM.cardsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #b0b0b0;">Aucune carte trouvée</p>';
        return;
    }
    
    cards.forEach(card => {
        const cardEl = createCardElement(card);
        DOM.cardsGrid.appendChild(cardEl);
    });
}

// Créer un élément carte
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card';
    
    const imageUrl = card.card_images && card.card_images[0] 
        ? card.card_images[0].image_url 
        : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22220%22 height=%22320%22%3E%3Crect fill=%22%232a2f54%22 width=%22220%22 height=%22320%22/%3E%3C/svg%3E';
    
    // Déterminer le type
    const type = card.type || 'Unknown';
    const typeDisplay = type.includes('Monster') ? 'Monstre' : 
                       type.includes('Spell') ? 'Magie' : 
                       type.includes('Trap') ? 'Piège' : type;
    
    // Stats
    let statsHTML = '';
    if (type.includes('Monster')) {
        if (card.atk !== undefined) {
            statsHTML += `ATK: ${card.atk}`;
        }
        if (card.def !== undefined) {
            statsHTML += ` | DEF: ${card.def}`;
        }
        if (card.level) {
            statsHTML += ` | Lv${card.level}`;
        }
    }
    
    div.innerHTML = `
        <img src="${imageUrl}" alt="${card.name}" class="card-image" loading="lazy">
        <div class="card-body">
            <div class="card-name">${card.name}</div>
            <div class="card-type">${typeDisplay}</div>
            ${statsHTML ? `<div class="card-stats">${statsHTML}</div>` : ''}
        </div>
    `;
    
    div.addEventListener('click', () => showCardDetails(card));
    
    return div;
}

// Afficher les détails d'une carte
function showCardDetails(card) {
    const imageUrl = card.card_images && card.card_images[0] 
        ? card.card_images[0].image_url 
        : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22560%22%3E%3Crect fill=%22%232a2f54%22 width=%22400%22 height=%22560%22/%3E%3C/svg%3E';
    
    DOM.modalImage.src = imageUrl;
    DOM.modalName.textContent = card.name;
    
    // Détails
    let detailsHTML = '';
    
    if (card.type) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">Type</span>
                <span class="modal-detail-value">${card.type}</span>
            </div>
        `;
    }
    
    if (card.attribute) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">Attribut</span>
                <span class="modal-detail-value">${card.attribute}</span>
            </div>
        `;
    }
    
    if (card.race) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">Race</span>
                <span class="modal-detail-value">${card.race}</span>
            </div>
        `;
    }
    
    if (card.level) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">Niveau</span>
                <span class="modal-detail-value">${card.level}</span>
            </div>
        `;
    }
    
    if (card.atk !== undefined) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">ATK</span>
                <span class="modal-detail-value">${card.atk}</span>
            </div>
        `;
    }
    
    if (card.def !== undefined) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">DEF</span>
                <span class="modal-detail-value">${card.def}</span>
            </div>
        `;
    }
    
    if (card.desc) {
        detailsHTML += `
            <div class="modal-detail">
                <span class="modal-detail-label">Description</span>
                <span class="modal-detail-value" style="display: block; margin-top: 8px; line-height: 1.6;">${card.desc}</span>
            </div>
        `;
    }
    
    DOM.modalDetails.innerHTML = detailsHTML;
    
    // Sets
    let setsHTML = '';
    if (card.card_sets && card.card_sets.length > 0) {
        setsHTML = '<div class="modal-sets"><h3>📦 Ensembles</h3>';
        card.card_sets.forEach(set => {
            setsHTML += `
                <div class="set-item">
                    <strong>${set.set_name}</strong> - ${set.set_rarity}
                </div>
            `;
        });
        setsHTML += '</div>';
    }
    
    DOM.modalSets.innerHTML = setsHTML;
    
    // Ouvrir modal
    DOM.modal.classList.remove('hidden');
}

// Afficher/cacher chargement
function showLoading(show) {
    if (show) {
        DOM.loading.classList.remove('hidden');
    } else {
        DOM.loading.classList.add('hidden');
    }
}

// Afficher erreur
function showError(message) {
    if (message) {
        DOM.error.textContent = message;
        DOM.error.classList.remove('hidden');
    } else {
        DOM.error.classList.add('hidden');
    }
}

// Mettre à jour le compteur de résultats
function updateResultCount() {
    const count = filteredCards.length;
    DOM.resultCount.textContent = `${count} carte${count !== 1 ? 's' : ''} trouvée${count !== 1 ? 's' : ''}`;
}

// Charger les decks officiels
async function loadTopDecks() {
    try {
        const response = await fetch(`${BACKEND_API}/top-decks`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayTopDecks(data.data);
        }
    } catch (err) {
        console.error('Erreur chargement decks:', err);
        DOM.decksList.innerHTML = '<p style="color: #b0b0b0;">Erreur lors du chargement des decks</p>';
    }
}

// Afficher les decks dans la grille
function displayTopDecks(decks) {
    DOM.decksList.innerHTML = '';
    
    decks.forEach(deck => {
        const deckEl = document.createElement('div');
        deckEl.className = 'deck-card';
        
        deckEl.innerHTML = `
            <div class="deck-card-header">
                <div class="deck-card-name">${deck.deck_name}</div>
                <div class="deck-card-meta">
                    <div class="deck-meta-item">
                        <span class="deck-meta-label">Archetype</span>
                        <span>${deck.deck_archtype || 'N/A'}</span>
                    </div>
                    <div class="deck-meta-item">
                        <span class="deck-meta-label">Placement</span>
                        <span>${deck.placement || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="deck-card-stats">
                <div class="deck-stat">
                    <span class="deck-stat-value">${deck.main_cards ? deck.main_cards.length : 0}</span>
                    <span class="deck-stat-label">Main Deck</span>
                </div>
                <div class="deck-stat">
                    <span class="deck-stat-value">${deck.extra_cards ? deck.extra_cards.length : 0}</span>
                    <span class="deck-stat-label">Extra Deck</span>
                </div>
                <div class="deck-stat">
                    <span class="deck-stat-value">${deck.side_cards ? deck.side_cards.length : 0}</span>
                    <span class="deck-stat-label">Side Deck</span>
                </div>
            </div>
            
            <div style="font-size: 0.85em; color: var(--gray);">
                <div><strong>Tournoi:</strong> ${deck.tournament || 'N/A'}</div>
                <div><strong>Joueur:</strong> ${deck.player || 'N/A'}</div>
            </div>
            
            <button class="deck-card-button" onclick="showDeckDetails(this)">Voir le deck complet</button>
        `;
        
        // Ajouter les données du deck à l'élément pour un accès ultérieur
        deckEl.deckData = deck;
        
        DOM.decksList.appendChild(deckEl);
    });
}

// Afficher les détails du deck dans une modal
function showDeckDetails(button) {
    const deckCard = button.closest('.deck-card');
    const deck = deckCard.deckData;
    
    let html = `
        <div style="padding: 30px;">
            <h2 style="color: var(--primary); margin-bottom: 10px;">${deck.deck_name}</h2>
            
            <div style="margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9em; color: var(--gray);">
                <div>
                    <strong style="color: var(--primary);">Archetype:</strong><br>${deck.deck_archtype || 'N/A'}
                </div>
                <div>
                    <strong style="color: var(--primary);">Tournoi:</strong><br>${deck.tournament || 'N/A'}
                </div>
                <div>
                    <strong style="color: var(--primary);">Date:</strong><br>${deck.date ? new Date(deck.date).toLocaleDateString('fr-FR') : 'N/A'}
                </div>
                <div>
                    <strong style="color: var(--primary);">Joueur:</strong><br>${deck.player || 'N/A'}
                </div>
                <div>
                    <strong style="color: var(--primary);">Placement:</strong><br>${deck.placement || 'N/A'}
                </div>
            </div>
            
            <hr style="border: 1px solid rgba(255, 215, 0, 0.2); margin: 20px 0;">
            
            ${createDeckListHTML(deck.main_cards, '📋 Main Deck')}
            ${createDeckListHTML(deck.extra_cards, '✨ Extra Deck')}
            ${createDeckListHTML(deck.side_cards, '🛡️ Side Deck')}
        </div>
    `;
    
    DOM.deckModal.querySelector('#deckModalBody').innerHTML = html;
    DOM.deckModal.classList.remove('hidden');
}

// Créer le HTML pour une liste de cartes du deck
function createDeckListHTML(cards, title) {
    if (!cards || cards.length === 0) return '';
    
    let html = `
        <div class="deck-list-section">
            <div class="deck-list-title">${title}</div>
            <div class="deck-list-cards">
    `;
    
    cards.forEach(cardName => {
        html += `
            <div class="deck-card-item-wrapper" onclick="searchCardFromDeck('${cardName.replace(/'/g, "\\'")}')" title="${cardName}">
                <img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%22110%22%3E%3Crect fill=%22%232a2f54%22 width=%2280%22 height=%22110%22/%3E%3C/svg%3E" alt="${cardName}" class="deck-card-img" data-card-name="${cardName}" loading="lazy">
                <div class="deck-card-name-small">${cardName}</div>
            </div>
        `;
        // Charger l'image réelle asynchrone
        loadDeckCardImage(cardName);
    });
    
    html += `</div></div>`;
    return html;
}

// Charger l'image d'une carte du deck
async function loadDeckCardImage(cardName) {
    try {
        const response = await fetch(`${API_BASE}/cardinfo.php?fname=${encodeURIComponent(cardName)}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.data && data.data.length > 0 && data.data[0].card_images && data.data[0].card_images[0]) {
            const imageUrl = data.data[0].card_images[0].image_url;
            // Mettre à jour toutes les images de cette carte
            const imgs = document.querySelectorAll(`.deck-card-img[alt="${cardName}"]`);
            imgs.forEach(img => {
                img.src = imageUrl;
            });
        }
    } catch (err) {
        console.error('Erreur chargement image deck:', err);
    }
}

// Chercher une carte depuis un deck
function searchCardFromDeck(cardName) {
    DOM.searchInput.value = cardName;
    search();
    // Fermer la modal du deck
    closeModal();
}

// Fermer modal
function closeModal() {
    DOM.modal.classList.add('hidden');
    DOM.deckModal.classList.add('hidden');
}
