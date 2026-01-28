const resultContainer = document.getElementById('result');
const newChallengeBtn = document.getElementById('newChallengeBtn');
const typeFilter = document.getElementById('typeFilter');

const typeEmojis = {
  'education': '📚',
  'recreational': '🎮',
  'social': '👥',
  'diy': '🛠️',
  'charity': '❤️',
  'cooking': '👨‍🍳',
  'relaxation': '🧘',
  'music': '🎵',
  'busywork': '📋',
  'sport': '⚽',
  'reading': '📖',
  'travel': '✈️',
  'health': '💪',
  'photography': '📷',
  'painting': '🎨',
  'writing': '✍️',
  'gaming': '🕹️',
  'gardening': '🌱',
  'dancing': '💃',
  'volunteering': '🤝',
  'crafting': '✂️',
  'movie': '🎬',
  'coding': '💻',
  'learning': '🧠'
};

const typeLabels = {
  'education': 'Education',
  'recreational': 'Loisir',
  'social': 'Social',
  'diy': 'DIY',
  'charity': 'Charité',
  'cooking': 'Cuisine',
  'relaxation': 'Relaxation',
  'music': 'Musique',
  'busywork': 'Travail',
  'sport': 'Sport',
  'reading': 'Lecture',
  'travel': 'Voyage',
  'health': 'Santé',
  'photography': 'Photographie',
  'painting': 'Peinture',
  'writing': 'Écriture',
  'gaming': 'Gaming',
  'gardening': 'Jardinage',
  'dancing': 'Danse',
  'volunteering': 'Bénévolat',
  'crafting': 'Artisanat',
  'movie': 'Films',
  'coding': 'Programmation',
  'learning': 'Apprentissage'
};

// Geek/Gaming Challenges ONLY
const fallbackChallenges = {
  'gaming': [
    { activity: "Obtenir le platine sur Elden Ring", type: "gaming", accessibility: 0.8, price: 0.3, participants: 1 },
    { activity: "Terminer Dark Souls 3 sans se faire toucher", type: "gaming", accessibility: 0.9, price: 0.2, participants: 1 },
    { activity: "Atteindre Rank 1 dans League of Legends", type: "gaming", accessibility: 0.85, price: 0, participants: 1 },
    { activity: "Speedrun Minecraft en moins de 15 minutes", type: "gaming", accessibility: 0.7, price: 0.1, participants: 1 },
    { activity: "Completer Cyberpunk 2077 avec tous les achievements", type: "gaming", accessibility: 0.7, price: 0.3, participants: 1 },
    { activity: "Atteindre Immortal dans Valorant", type: "gaming", accessibility: 0.85, price: 0, participants: 1 },
    { activity: "Terminer Hollow Knight avec tous les boss difficiles", type: "gaming", accessibility: 0.8, price: 0.1, participants: 1 },
    { activity: "Faire 1000 eliminations dans Fortnite", type: "gaming", accessibility: 0.6, price: 0, participants: 1 }
  ],
  'esports': [
    { activity: "Participer à un tournoi esports local", type: "gaming", accessibility: 0.5, price: 0.2, participants: 10 },
    { activity: "Streamer 8 heures d'affilée", type: "gaming", accessibility: 0.5, price: 0.1, participants: 1 },
    { activity: "Atteindre 10k followers sur Twitch", type: "gaming", accessibility: 0.8, price: 0, participants: 1 },
    { activity: "Créer un guide complet de speedrun", type: "gaming", accessibility: 0.7, price: 0, participants: 1 },
    { activity: "Gagner un tournoi d'esports professionnels", type: "gaming", accessibility: 0.95, price: 0.4, participants: 50 },
    { activity: "Atteindre 100k subscribers YouTube Gaming", type: "gaming", accessibility: 0.9, price: 0, participants: 1 },
    { activity: "Devenir pro player dans une équipe officielle", type: "gaming", accessibility: 0.92, price: 0.3, participants: 1 },
    { activity: "Caster un match esports professionnel", type: "gaming", accessibility: 0.7, price: 0.2, participants: 1 }
  ],
  'coding': [
    { activity: "Créer un clone de ChatGPT", type: "coding", accessibility: 0.8, price: 0, participants: 1 },
    { activity: "Contribuer au kernel Linux", type: "coding", accessibility: 0.9, price: 0, participants: 1 },
    { activity: "Gagner un hackathon majeur", type: "coding", accessibility: 0.7, price: 0.1, participants: 50 },
    { activity: "Build une app mobile avec 100k downloads", type: "coding", accessibility: 0.8, price: 0.1, participants: 1 },
    { activity: "Corriger un bug critique dans un projet GitHub populaire", type: "coding", accessibility: 0.6, price: 0, participants: 1 },
    { activity: "Créer un langage de programmation custom", type: "coding", accessibility: 0.9, price: 0, participants: 1 },
    { activity: "Publier une librairie Python qui devient viral", type: "coding", accessibility: 0.8, price: 0, participants: 1 },
    { activity: "Résoudre un CTF (Capture The Flag) avancé", type: "coding", accessibility: 0.8, price: 0, participants: 1 }
  ],
  'tech': [
    { activity: "Builder un PC gaming 4K performant", type: "coding", accessibility: 0.6, price: 0.7, participants: 1 },
    { activity: "Overclocker un GPU pour batte un record", type: "coding", accessibility: 0.8, price: 0.3, participants: 1 },
    { activity: "Installer un serveur home lab complet", type: "coding", accessibility: 0.7, price: 0.4, participants: 1 },
    { activity: "Modder une console de retro gaming", type: "coding", accessibility: 0.6, price: 0.2, participants: 1 },
    { activity: "Construire un drone de compétition", type: "coding", accessibility: 0.75, price: 0.5, participants: 1 },
    { activity: "Flasher et customiser une ROM Android", type: "coding", accessibility: 0.7, price: 0.1, participants: 1 },
    { activity: "Installer Arch Linux du zéro", type: "coding", accessibility: 0.8, price: 0, participants: 1 },
    { activity: "Configurer un NAS avec RAID 10", type: "coding", accessibility: 0.7, price: 0.5, participants: 1 }
  ],
  'anime': [
    { activity: "Regarder une anime complète de 100+ épisodes", type: "gaming", accessibility: 0.4, price: 0.1, participants: 1 },
    { activity: "Regarder tous les films Studio Ghibli", type: "gaming", accessibility: 0.3, price: 0.2, participants: 1 },
    { activity: "Finir One Piece (tous les épisodes)", type: "gaming", accessibility: 0.6, price: 0.1, participants: 1 },
    { activity: "Lire le manga complèt de Berserk", type: "gaming", accessibility: 0.7, price: 0.2, participants: 1 },
    { activity: "Assister à une Japan Expo", type: "gaming", accessibility: 0.3, price: 0.3, participants: 3 },
    { activity: "Cosplay un personnage anime complexe", type: "gaming", accessibility: 0.5, price: 0.2, participants: 1 },
    { activity: "Apprendre le japonais via anime", type: "gaming", accessibility: 0.7, price: 0, participants: 1 },
    { activity: "Collectionner tous les mangas d'une série", type: "gaming", accessibility: 0.5, price: 0.3, participants: 1 }
  ],
  'cyber': [
    { activity: "Passer la certification CEH", type: "coding", accessibility: 0.8, price: 0.4, participants: 1 },
    { activity: "Hacker éthique: résoudre 100 challenges HackTheBox", type: "coding", accessibility: 0.85, price: 0, participants: 1 },
    { activity: "Participer à un bug bounty et trouver une faille", type: "coding", accessibility: 0.7, price: 0, participants: 1 },
    { activity: "Créer un worm pour tester son réseau", type: "coding", accessibility: 0.85, price: 0, participants: 1 },
    { activity: "Cracker un chiffrement WPA2", type: "coding", accessibility: 0.8, price: 0, participants: 1 },
    { activity: "Analyser des malware en sandbox", type: "coding", accessibility: 0.8, price: 0.1, participants: 1 },
    { activity: "Passer la certification OSCP", type: "coding", accessibility: 0.9, price: 0.3, participants: 1 },
    { activity: "Devenir ethical hacker professionnel", type: "coding", accessibility: 0.9, price: 0.4, participants: 1 }
  ],
  'retro': [
    { activity: "Terminer Super Metroid sans items", type: "gaming", accessibility: 0.8, price: 0.1, participants: 1 },
    { activity: "Finir Mega Man sans dégâts", type: "gaming", accessibility: 0.85, price: 0.1, participants: 1 },
    { activity: "Completer Castlevania en difficile", type: "gaming", accessibility: 0.8, price: 0.1, participants: 1 },
    { activity: "Speedrun Dragon's Lair", type: "gaming", accessibility: 0.7, price: 0.1, participants: 1 },
    { activity: "Obtenir le high score arcade classique", type: "gaming", accessibility: 0.6, price: 0.1, participants: 1 },
    { activity: "Compléter Contra sans cheat code", type: "gaming", accessibility: 0.85, price: 0.1, participants: 1 },
    { activity: "Terminer Battletoads complètement", type: "gaming", accessibility: 0.9, price: 0.1, participants: 1 },
    { activity: "Jouer et finir tous les Zelda NES", type: "gaming", accessibility: 0.7, price: 0.2, participants: 1 }
  ],
  'vr': [
    { activity: "Completer Half-Life Alyx en VR", type: "gaming", accessibility: 0.7, price: 0.6, participants: 1 },
    { activity: "Atteindre le top 100 global sur Beat Saber Expert+", type: "gaming", accessibility: 0.8, price: 0.5, participants: 1 },
    { activity: "Finir Resident Evil 4 VR", type: "gaming", accessibility: 0.7, price: 0.6, participants: 1 },
    { activity: "Jouer 10 heures de VR sans mal de tête", type: "gaming", accessibility: 0.5, price: 0.5, participants: 1 },
    { activity: "Builder un setup VR premium", type: "gaming", accessibility: 0.7, price: 0.8, participants: 1 },
    { activity: "Streamer des sessions VR hardcore", type: "gaming", accessibility: 0.6, price: 0.5, participants: 1 },
    { activity: "Développer un jeu VR custom", type: "gaming", accessibility: 0.8, price: 0.5, participants: 1 },
    { activity: "Participer à un tournoi VR esports", type: "gaming", accessibility: 0.6, price: 0.3, participants: 5 }
  ]
};

const allFallbacks = Object.values(fallbackChallenges).flat();

function showLoading() {
  resultContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement du défi...</div>';
}

function displayChallenge(data) {
  const emoji = typeEmojis[data.type] || '⭐';
  const typeLabel = typeLabels[data.type] || data.type;
  
  // Convert accessibility and price to percentages
  const accessibility = Math.round((1 - data.accessibility) * 100);
  const price = Math.round(data.price * 100);
  const participantCount = data.participants || 1;

  const html = `
    <div class="challenge-card">
      <div class="challenge-activity">${data.activity}</div>
      
      <div class="challenge-details">
        <div class="detail-item">
          <div class="detail-label">👥 Participants</div>
          <div class="detail-value">${participantCount}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">💰 Coût</div>
          <div class="detail-value">${price}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">♿ Accessibilité</div>
          <div class="detail-value">${100 - accessibility}%</div>
        </div>
      </div>
      
      <div class="difficulty-bar">
        <span class="difficulty-label">Difficulté:</span>
        <div class="bar">
          <div class="bar-fill" style="width: ${accessibility}%"></div>
        </div>
      </div>
      
      <div class="type-badge">${emoji} ${typeLabel}</div>
    </div>
  `;
  
  resultContainer.innerHTML = html;
}

function displayError(message) {
  resultContainer.innerHTML = `<div class="error-message">❌ ${message}</div>`;
}

function getRandomChallenge(type = '') {
  let challenges;
  
  if (type && fallbackChallenges[type]) {
    challenges = fallbackChallenges[type];
  } else {
    challenges = allFallbacks;
  }
  
  return challenges[Math.floor(Math.random() * challenges.length)];
}

async function loadChallenge() {
  showLoading();
  
  try {
    const type = typeFilter.value;
    const url = type 
      ? `https://www.boredapi.com/api/activity?type=${type}`
      : 'https://www.boredapi.com/api/activity';
    
    console.log('Fetching from Bored API:', url);
    
    try {
      // Try direct fetch without timeout first
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Bored API Success:', data);
        
        if (data.activity) {
          displayChallenge(data);
          return;
        }
      }
    } catch (e) {
      console.log('Direct fetch failed:', e.message);
    }
    
    // If API fails, try with retry
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.activity) {
          displayChallenge(data);
          return;
        }
      }
    } catch (e) {
      console.log('Retry failed:', e.message);
    }
    
    // Last resort: use fallback
    console.log('Using fallback challenge');
    const filtered = type 
      ? fallbackChallenges[type] || allFallbacks
      : allFallbacks;
    
    if (filtered.length > 0) {
      displayChallenge(filtered[Math.floor(Math.random() * filtered.length)]);
    } else {
      displayChallenge(allFallbacks[Math.floor(Math.random() * allFallbacks.length)]);
    }
    
  } catch (error) {
    console.error('Erreur:', error);
    displayChallenge(allFallbacks[Math.floor(Math.random() * allFallbacks.length)]);
  }
}

// Event listeners
newChallengeBtn.addEventListener('click', loadChallenge);
typeFilter.addEventListener('change', loadChallenge);

// Load initial challenge
loadChallenge();
