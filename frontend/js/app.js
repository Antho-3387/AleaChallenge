// TAB SWITCHING
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Remove active class from all tabs and buttons
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to selected tab and button
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load content based on tab
    if (tabName === 'archetypes') {
        loadArchetypes();
    } else if (tabName === 'banlist') {
        getBanlist();
    } else if (tabName === 'decks') {
        loadTopDecks();
    }
}

// SEARCH CARDS
async function searchCards() {
    const query = document.getElementById('cardSearch').value.trim();
    if (!query) {
        showError('cards', 'Veuillez entrer un nom de carte');
        return;
    }

    showLoading('cards', true);
    hideError('cards');

    try {
        const result = await searchCardsAPI(query);
        if (result.status === 'success' && result.data && result.data.length > 0) {
            displayCards('cardsGrid', result.data);
        } else {
            showError('cards', 'Aucune carte trouvée. Vérifiez l\'orthographe!');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('cards', 'Erreur lors de la recherche: ' + error.message);
    } finally {
        showLoading('cards', false);
    }
}

// DISPLAY CARDS
function displayCards(gridID, cards) {
    const grid = document.getElementById(gridID);
    grid.innerHTML = '';

    cards.forEach(card => {
        const imageUrl = card.card_images && card.card_images.length > 0 
            ? card.card_images[0].image_url 
            : 'https://via.placeholder.com/200x280?text=Card';

        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.onclick = () => showCardDetails(card);
        cardEl.innerHTML = `
            <img src="${imageUrl}" alt="${card.name}" onerror="this.src='https://via.placeholder.com/200x280?text=Card'">
            <div class="card-info">
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type || 'Unknown'}</div>
                ${card.atk !== undefined && card.def !== undefined 
                    ? `<div class="card-stats">ATK: ${card.atk} | DEF: ${card.def}</div>` 
                    : ''}
            </div>
        `;
        grid.appendChild(cardEl);
    });
}

// SHOW CARD DETAILS
function showCardDetails(card) {
    const modal = document.getElementById('cardModal');
    const modalBody = document.getElementById('modalBody');

    const imageUrl = card.card_images && card.card_images.length > 0 
        ? card.card_images[0].image_url 
        : 'https://via.placeholder.com/400x560?text=Card';

    let statsHTML = '';
    if (card.atk !== undefined && card.def !== undefined) {
        statsHTML = `
            <div class="modal-card-detail">
                <strong>ATK:</strong> ${card.atk} | <strong>DEF:</strong> ${card.def}
            </div>
        `;
    }
    if (card.level) {
        statsHTML += `
            <div class="modal-card-detail">
                <strong>Niveau:</strong> ${card.level}
            </div>
        `;
    }

    let setsHTML = '';
    if (card.card_sets && card.card_sets.length > 0) {
        setsHTML = '<div class="modal-card-detail"><strong>Disponible dans:</strong><br>';
        card.card_sets.slice(0, 5).forEach(set => {
            setsHTML += `${set.set_name} (${set.set_rarity})<br>`;
        });
        setsHTML += '</div>';
    }

    modalBody.innerHTML = `
        <img src="${imageUrl}" alt="${card.name}" class="modal-card-image" 
             onerror="this.src='https://via.placeholder.com/400x560?text=Card'">
        <h2 style="color: #ffd700; margin-bottom: 15px;">${card.name}</h2>
        <div class="modal-card-detail">
            <strong>Type:</strong> ${card.type || 'Unknown'}
        </div>
        ${card.archtype ? `<div class="modal-card-detail"><strong>Archétype:</strong> ${card.archtype}</div>` : ''}
        ${statsHTML}
        ${setsHTML}
        <div class="modal-card-detail" style="margin-top: 20px;">
            <strong>Description:</strong>
            <p style="margin-top: 10px; line-height: 1.6;">${card.desc || 'No description'}</p>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #ffd700; padding-top: 20px;">
            <button onclick="loadDecksWithCard('${card.name}')" style="background: #ffd700; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                📋 Voir les decks contenant cette carte
            </button>
            <div id="relatedDecks" style="margin-top: 15px;"></div>
        </div>
    `;

    modal.classList.add('show');
}

async function loadDecksWithCard(cardName) {
    const decksDiv = document.getElementById('relatedDecks');
    decksDiv.innerHTML = '<p style="color: #ffd700;">Chargement des decks...</p>';
    
    try {
        const result = await fetch(`/api/decks-by-card?card=${encodeURIComponent(cardName)}`).then(r => r.json());
        if (result.status === 'success' && result.data && result.data.length > 0) {
            displayRelatedDecks(result.data, decksDiv);
        } else {
            decksDiv.innerHTML = '<p style="color: #888;">Aucun deck trouvé contenant cette carte</p>';
        }
    } catch (error) {
        decksDiv.innerHTML = `<p style="color: #ff6b6b;">Erreur: ${error.message}</p>`;
    }
}

function displayRelatedDecks(decks, container) {
    container.innerHTML = '';
    
    decks.forEach(deck => {
        const deckSection = document.createElement('div');
        deckSection.style.background = 'rgba(255, 215, 0, 0.1)';
        deckSection.style.border = '1px solid #ffd700';
        deckSection.style.padding = '15px';
        deckSection.style.borderRadius = '5px';
        deckSection.style.marginBottom = '15px';
        deckSection.style.cursor = 'pointer';
        deckSection.onclick = () => showFullDeckList(deck);
        
        deckSection.innerHTML = `
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 8px;">${deck.deck_name}</div>
            <div style="color: #b0b0b0; font-size: 0.9em;">
                🏛️ ${deck.tournament} - ${new Date(deck.date).toLocaleDateString('fr-FR')}<br>
                🏆 ${deck.placement}
            </div>
            <div style="color: #888; font-size: 0.85em; margin-top: 8px;">
                Cliquez pour voir la liste complète (Main: ${deck.main_cards?.length || 0}, Extra: ${deck.extra_cards?.length || 0}, Side: ${deck.side_cards?.length || 0})
            </div>
        `;
        
        container.appendChild(deckSection);
    });
}

function showFullDeckList(deck) {
    const modal = document.getElementById('deckListModal');
    if (!modal) {
        // Créer la modal s'il elle n'existe pas
        const newModal = document.createElement('div');
        newModal.id = 'deckListModal';
        newModal.className = 'modal';
        document.body.appendChild(newModal);
    }
    
    const modal2 = document.getElementById('deckListModal');
    modal2.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close" onclick="document.getElementById('deckListModal').classList.remove('show')">&times;</span>
            <h2 style="color: #ffd700; margin-bottom: 20px;">${deck.deck_name}</h2>
            
            <div style="margin-bottom: 20px; color: #b0b0b0;">
                <strong>Tournoi:</strong> ${deck.tournament}<br>
                <strong>Date:</strong> ${new Date(deck.date).toLocaleDateString('fr-FR')}<br>
                <strong>Placement:</strong> ${deck.placement}<br>
                <strong>Joueur:</strong> ${deck.player}
            </div>
            
            <h3 style="color: #ffd700; margin-top: 20px;">📋 Main Deck (${deck.main_cards?.length || 0} cartes)</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                ${(deck.main_cards || []).map(card => `<div style="color: #fff; padding: 3px 0;">• ${card}</div>`).join('')}
            </div>
            
            <h3 style="color: #ffd700; margin-top: 20px;">✨ Extra Deck (${deck.extra_cards?.length || 0} cartes)</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; max-height: 150px; overflow-y: auto; margin-bottom: 15px;">
                ${(deck.extra_cards || []).map(card => `<div style="color: #fff; padding: 3px 0;">• ${card}</div>`).join('')}
            </div>
            
            <h3 style="color: #ffd700; margin-top: 20px;">🛡️ Side Deck (${deck.side_cards?.length || 0} cartes)</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; max-height: 150px; overflow-y: auto;">
                ${(deck.side_cards || []).map(card => `<div style="color: #fff; padding: 3px 0;">• ${card}</div>`).join('')}
            </div>
        </div>
    `;
    
    modal2.classList.add('show');
}

function closeCardModal() {
    document.getElementById('cardModal').classList.remove('show');
}

// ARCHETYPES
async function loadArchetypes() {
    showLoading('archetypes', true);

    try {
        const result = await getArchetypesAPI();
        if (result.status === 'success' && result.data) {
            displayArchetypes(result.data);
        }
    } catch (error) {
        console.error('Erreur archetypes:', error);
    } finally {
        showLoading('archetypes', false);
    }
}

function displayArchetypes(archetypes) {
    const list = document.getElementById('archetypesList');
    list.innerHTML = '';

    archetypes.forEach(archetype => {
        const btn = document.createElement('button');
        btn.className = 'archetype-btn';
        btn.textContent = archetype;
        btn.onclick = () => searchArchetypeCards(archetype);
        list.appendChild(btn);
    });
}

async function searchArchetypeCards(archetype) {
    showLoading('archetypes', true);

    try {
        const result = await searchByArchetype(archetype);
        if (result.status === 'success' && result.data) {
            displayCards('archetypesGrid', result.data);
        }
    } catch (error) {
        console.error('Erreur recherche archetype:', error);
    } finally {
        showLoading('archetypes', false);
    }
}

// BANLIST
async function getBanlist() {
    const format = document.getElementById('banlistFormat').value;
    showLoading('banlist', true);

    try {
        const result = await getBanlistAPI(format);
        if (result.status === 'success' && result.data) {
            displayBanlist(result.data);
        }
    } catch (error) {
        console.error('Erreur banlist:', error);
    } finally {
        showLoading('banlist', false);
    }
}

function displayBanlist(banlists) {
    const content = document.getElementById('banlistContent');
    content.innerHTML = '';

    if (!banlists || banlists.length === 0) {
        content.innerHTML = '<p>Aucune banlist disponible</p>';
        return;
    }

    banlists.forEach(banlist => {
        const section = document.createElement('div');
        section.style.marginBottom = '30px';
        section.style.background = 'rgba(30, 35, 50, 0.6)';
        section.style.padding = '20px';
        section.style.borderRadius = '8px';
        section.style.borderLeft = '4px solid #ffd700';
        
        let headerHTML = `
            <h3 style="color: #ffd700; margin-bottom: 15px;">${banlist.banlist_name}</h3>
            <div style="color: #b0b0b0; margin-bottom: 20px;">
                <strong>📅 Date:</strong> ${banlist.banlist_date}
            </div>
        `;
        
        section.innerHTML = headerHTML;

        if (banlist.banned_cards && banlist.banned_cards.length > 0) {
            const cardsDiv = document.createElement('div');
            cardsDiv.style.display = 'grid';
            cardsDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            cardsDiv.style.gap = '15px';

            banlist.banned_cards.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.style.background = 'rgba(255, 215, 0, 0.05)';
                cardDiv.style.border = '1px solid #ffd700';
                cardDiv.style.padding = '12px';
                cardDiv.style.borderRadius = '5px';
                
                let statusColor = '#ff6b6b'; // Banned - red
                if (card.ban_status.includes('Limited')) {
                    statusColor = '#ffed4e'; // Limited - yellow
                }
                
                let dateInfo = '';
                if (card.ban_tcg_date) dateInfo += `<div style="color: #888; font-size: 0.85em;">📌 TCG: ${card.ban_tcg_date}</div>`;
                if (card.ban_ocg_date) dateInfo += `<div style="color: #888; font-size: 0.85em;">📌 OCG: ${card.ban_ocg_date}</div>`;
                
                cardDiv.innerHTML = `
                    <div style="color: #ffd700; font-weight: bold; margin-bottom: 8px;">${card.card_name}</div>
                    <div style="color: ${statusColor}; font-weight: bold; display: inline-block; background: ${statusColor}20; padding: 4px 8px; border-radius: 3px; margin-bottom: 8px;">
                        ${card.ban_status}
                    </div>
                    ${dateInfo}
                `;
                cardsDiv.appendChild(cardDiv);
            });

            section.appendChild(cardsDiv);
        } else {
            section.innerHTML += '<p style="color: #888;">Aucune carte bannie dans cette liste</p>';
        }

        content.appendChild(section);
    });
}

// TOP DECKS
async function loadTopDecks() {
    showLoading('decks', true);

    try {
        const result = await getTopDecksAPI();
        if (result.status === 'success' && result.data) {
            displayTopDecks(result.data);
        }
    } catch (error) {
        console.error('Erreur top decks:', error);
    } finally {
        showLoading('decks', false);
    }
}

function displayTopDecks(decks) {
    const decksList = document.getElementById('topDecks');
    decksList.innerHTML = '';

    if (!decks || decks.length === 0) {
        decksList.innerHTML = '<p>Aucun deck disponible</p>';
        return;
    }

    // Grouper par année
    const decksByYear = {};
    decks.forEach(deck => {
        const year = new Date(deck.date).getFullYear();
        if (!decksByYear[year]) {
            decksByYear[year] = [];
        }
        decksByYear[year].push(deck);
    });

    // Afficher par année (du plus récent au plus ancien)
    Object.keys(decksByYear).sort().reverse().forEach(year => {
        const yearSection = document.createElement('div');
        yearSection.style.marginBottom = '30px';

        const yearTitle = document.createElement('h3');
        yearTitle.style.color = '#ffd700';
        yearTitle.style.marginBottom = '15px';
        yearTitle.textContent = `📅 Année ${year}`;
        yearSection.appendChild(yearTitle);

        const decksGrid = document.createElement('div');
        decksGrid.style.display = 'grid';
        decksGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
        decksGrid.style.gap = '15px';

        decksByYear[year].forEach(deck => {
            const deckEl = document.createElement('div');
            deckEl.className = 'deck-card';
            
            let placementColor = '#ffd700';
            if (deck.placement.includes('2nd')) placementColor = '#c0c0c0';
            if (deck.placement.includes('3rd')) placementColor = '#cd7f32';
            
            deckEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div class="deck-name">${deck.deck_name}</div>
                    <div style="background: ${placementColor}; color: #1a1a2e; padding: 8px 12px; border-radius: 5px; font-weight: bold; font-size: 0.9em;">
                        🏆 ${deck.placement}
                    </div>
                </div>
                <div class="deck-info"><strong>🎴 Archétype:</strong> ${deck.deck_archtype}</div>
                <div class="deck-info"><strong>🏛️ Tournoi:</strong> ${deck.tournament}</div>
                <div class="deck-info"><strong>📅 Date:</strong> ${new Date(deck.date).toLocaleDateString('fr-FR')}</div>
            `;
            decksGrid.appendChild(deckEl);
        });

        yearSection.appendChild(decksGrid);
        decksList.appendChild(yearSection);
    });
}

// UTILITIES
function showLoading(tab, show) {
    const loading = document.getElementById(`${tab}Loading`);
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

function showError(tab, message) {
    const error = document.getElementById(`${tab}Error`);
    if (error) {
        error.textContent = message;
        error.classList.remove('hidden');
    }
}

function hideError(tab) {
    const error = document.getElementById(`${tab}Error`);
    if (error) {
        error.classList.add('hidden');
    }
}

// CLOSE MODAL ON CLICK OUTSIDE
document.getElementById('cardModal').addEventListener('click', function(event) {
    if (event.target === this) {
        this.classList.remove('show');
    }
});

// ENTER KEY SEARCH
document.getElementById('cardSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchCards();
    }
});
