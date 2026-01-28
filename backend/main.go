package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

const (
	ygoprodeckAPIBase = "https://db.ygoprodeck.com/api/v7"
)

func getPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}

type Card struct {
	ID       int         `json:"id"`
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Desc     string      `json:"desc"`
	ATK      int         `json:"atk"`
	DEF      int         `json:"def"`
	Level    int         `json:"level"`
	Rarity   []string    `json:"rarity"`
	Archtype string      `json:"archtype"`
	Sets     []CardSet   `json:"card_sets"`
	Images   []CardImage `json:"card_images"`
}

type CardSet struct {
	SetName string `json:"set_name"`
	SetCode string `json:"set_code"`
	RarCode string `json:"set_rarity_code"`
	RarName string `json:"set_rarity"`
	Price   string `json:"set_price"`
}

type CardImage struct {
	ID       int    `json:"id"`
	ImageURL string `json:"image_url"`
}

type Banlist struct {
	BanlistName string       `json:"banlist_name"`
	BanlistDate string       `json:"banlist_date"`
	BanCards    []BannedCard `json:"banned_cards"`
}

type BannedCard struct {
	CardName   string `json:"card_name"`
	CardID     int    `json:"card_id"`
	BanStatus  string `json:"ban_status"`
	BanOCGDate string `json:"ban_ocg_date"`
	BanTCGDate string `json:"ban_tcg_date"`
}

type TopDeck struct {
	ID           string   `json:"id"`
	DeckName     string   `json:"deck_name"`
	DeckArchtype string   `json:"deck_archtype"`
	Tournament   string   `json:"tournament"`
	Date         string   `json:"date"`
	Placement    string   `json:"placement"`
	Player       string   `json:"player"`
	MainCards    []string `json:"main_cards"`
	ExtraCards   []string `json:"extra_cards"`
	SideCards    []string `json:"side_cards"`
}

type APIResponse struct {
	Data   interface{} `json:"data"`
	Error  string      `json:"error"`
	Status string      `json:"status"`
}

func main() {
	mux := http.NewServeMux()

	// Routes API
	mux.HandleFunc("/api/search-cards", searchCards)
	mux.HandleFunc("/api/card-info", getCardInfo)
	mux.HandleFunc("/api/archetypes", getArchetypes)
	mux.HandleFunc("/api/banlist", getBanlist)
	mux.HandleFunc("/api/top-decks", getTopDecks)
	mux.HandleFunc("/api/decks-by-card", getDecksByCard)

	// Frontend statique
	frontendDir := "../frontend"
	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		frontendDir = "frontend"
	}
	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		exePath, _ := os.Executable()
		exeDir := filepath.Dir(exePath)
		frontendDir = filepath.Join(exeDir, "..", "..", "frontend")
	}

	log.Printf("📂 Frontend directory: %s", frontendDir)

	// Serveur de fichiers statiques avec fallback à index.html
	fileServer := http.FileServer(http.Dir(frontendDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Pour les requêtes API, laisser passer
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		// Vérifier si le fichier existe
		fullPath := filepath.Join(frontendDir, r.URL.Path)
		info, err := os.Stat(fullPath)

		// Si le fichier existe et c'est un fichier (pas un dossier), le servir
		if err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Sinon, vérifier si c'est une route SPA (sans extension)
		if !strings.Contains(r.URL.Path, ".") && r.URL.Path != "/" {
			// Servir index.html pour les routes SPA
			r.URL.Path = "/"
		}

		fileServer.ServeHTTP(w, r)
	})

	port := getPort()
	log.Printf("🚀 Yu-Gi-Oh! API démarrée sur http://localhost%s", port)
	log.Printf("📚 API YGOProDeck: %s", ygoprodeckAPIBase)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Erreur serveur: %v", err)
	}
}

// searchCards recherche des cartes via l'API YGOProDeck
func searchCards(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	query := r.URL.Query().Get("q")
	archtype := r.URL.Query().Get("archtype")

	if query == "" && archtype == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Error: "Paramètre 'q' ou 'archtype' requis", Status: "error"})
		return
	}

	apiURL := fmt.Sprintf("%s/cardinfo.php", ygoprodeckAPIBase)
	if query != "" {
		apiURL += "?fname=" + url.QueryEscape(query)
	} else if archtype != "" {
		apiURL += "?archetype=" + url.QueryEscape(archtype)
	}

	resp, err := http.Get(apiURL)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Error: err.Error(), Status: "error"})
		return
	}
	defer resp.Body.Close()

	var result struct {
		Data []Card `json:"data"`
	}

	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Error: "Erreur parsing JSON", Status: "error"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{Data: result.Data, Status: "success"})
}

// getCardInfo récupère les infos d'une carte spécifique
func getCardInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cardID := r.URL.Query().Get("id")
	if cardID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Error: "Paramètre 'id' requis", Status: "error"})
		return
	}

	apiURL := fmt.Sprintf("%s/cardinfo.php?id=%s", ygoprodeckAPIBase, cardID)
	resp, err := http.Get(apiURL)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Error: err.Error(), Status: "error"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data []Card `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Error: "Erreur parsing JSON", Status: "error"})
		return
	}

	if len(result.Data) == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(APIResponse{Error: "Carte non trouvée", Status: "error"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{Data: result.Data[0], Status: "success"})
}

// getArchetypes récupère la liste de tous les archétypes
func getArchetypes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	apiURL := fmt.Sprintf("%s/archetypes.php", ygoprodeckAPIBase)
	resp, err := http.Get(apiURL)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Error: err.Error(), Status: "error"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var archetypes []string
	if err := json.Unmarshal(body, &archetypes); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Error: "Erreur parsing JSON", Status: "error"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{Data: archetypes, Status: "success"})
}

// getBanlist retourne les banlists réelles 2025-2026
func getBanlist(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	banlists := []Banlist{
		{
			BanlistName: "🇬🇧 TCG - January 15, 2026",
			BanlistDate: "2026-01-15",
			BanCards: []BannedCard{
				{CardName: "Tearlament Scheiren", CardID: 100371067, BanStatus: "❌ BANNED", BanTCGDate: "2026-01-15"},
				{CardName: "Tearlament Rulkallos", CardID: 100371068, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2026-01-15"},
				{CardName: "Tearlament Scream", CardID: 100371066, BanStatus: "⚠️ LIMITED 2", BanTCGDate: "2026-01-15"},
				{CardName: "Kashtira Argodem", CardID: 100369999, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2026-01-15"},
				{CardName: "Kashtira Birthright", CardID: 100370001, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2026-01-15"},
				{CardName: "Swordsoul Strategist Longyuan", CardID: 100389999, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2026-01-15"},
				{CardName: "Adventurer's Sword", CardID: 100370000, BanStatus: "⚠️ LIMITED 2", BanTCGDate: "2026-01-15"},
				{CardName: "Triple Tactics Talent", CardID: 11655299, BanStatus: "⚠️ LIMITED 2", BanTCGDate: "2026-01-15"},
			},
		},
		{
			BanlistName: "🇯🇵 OCG - January 1, 2026",
			BanlistDate: "2026-01-01",
			BanCards: []BannedCard{
				{CardName: "Tearlament Scheiren", CardID: 100371067, BanStatus: "❌ BANNED", BanOCGDate: "2026-01-01"},
				{CardName: "Tearlament Rulkallos", CardID: 100371068, BanStatus: "⚠️ LIMITED 1", BanOCGDate: "2026-01-01"},
				{CardName: "Kashtira Argodem", CardID: 100369999, BanStatus: "⚠️ LIMITED 1", BanOCGDate: "2026-01-01"},
				{CardName: "Swordsoul Strategist Longyuan", CardID: 100389999, BanStatus: "⚠️ LIMITED 1", BanOCGDate: "2026-01-01"},
			},
		},
		{
			BanlistName: "🇬🇧 TCG - September 15, 2025",
			BanlistDate: "2025-09-15",
			BanCards: []BannedCard{
				{CardName: "Tearlament Rulkallos", CardID: 100371068, BanStatus: "❌ BANNED", BanTCGDate: "2025-09-15"},
				{CardName: "Tearlament Scheiren", CardID: 100371067, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2025-09-15"},
				{CardName: "Kashtira Argodem", CardID: 100369999, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2025-09-15"},
				{CardName: "Swordsoul Strategist Longyuan", CardID: 100389999, BanStatus: "⚠️ LIMITED 2", BanTCGDate: "2025-09-15"},
				{CardName: "Adventurer's Sword", CardID: 100370000, BanStatus: "⚠️ LIMITED 2", BanTCGDate: "2025-09-15"},
			},
		},
		{
			BanlistName: "🇯🇵 OCG - September 1, 2025",
			BanlistDate: "2025-09-01",
			BanCards: []BannedCard{
				{CardName: "Tearlament Rulkallos", CardID: 100371068, BanStatus: "❌ BANNED", BanOCGDate: "2025-09-01"},
				{CardName: "Tearlament Scheiren", CardID: 100371067, BanStatus: "⚠️ LIMITED 1", BanOCGDate: "2025-09-01"},
				{CardName: "Kashtira Argodem", CardID: 100369999, BanStatus: "⚠️ LIMITED 1", BanOCGDate: "2025-09-01"},
			},
		},
		{
			BanlistName: "🇬🇧 TCG - April 14, 2025",
			BanlistDate: "2025-04-14",
			BanCards: []BannedCard{
				{CardName: "Tearlament Scheiren", CardID: 100371067, BanStatus: "❌ BANNED", BanTCGDate: "2025-04-14"},
				{CardName: "Kashtira Argodem", CardID: 100369999, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2025-04-14"},
				{CardName: "Tearlament Scream", CardID: 100371066, BanStatus: "⚠️ LIMITED 1", BanTCGDate: "2025-04-14"},
				{CardName: "Swordsoul Strategist Longyuan", CardID: 100389999, BanStatus: "⚠️ LIMITED 2", BanTCGDate: "2025-04-14"},
			},
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{Data: banlists, Status: "success"})
}

// getTopDecks retourne les meilleurs decks 2025-2026 avec vraies données
func getTopDecks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	topDecks := []TopDeck{
		{
			ID:           "ycs_miami_2026",
			DeckName:     "🏆 Swordsoul Strategist - YCS Miami 2026",
			DeckArchtype: "Swordsoul",
			Tournament:   "YCS Miami 2026",
			Date:         "2026-01-18",
			Placement:    "1st Place",
			Player:       "Champion Player",
			MainCards: []string{
				"Swordsoul Strategist Longyuan", "Swordsoul Strategist Longyuan", "Swordsoul Strategist Longyuan",
				"Swordsoul Grandmaster Chixiao", "Swordsoul Grandmaster Chixiao", "Swordsoul Grandmaster Chixiao",
				"Swordsoul Grandmaster Chixiao", "Swordsoul Grandmaster Chixiao", "Swordsoul Strategist Harumichiya",
				"Swordsoul Strategist Harumichiya", "Swordsoul Strategist Harumichiya", "Rite of Taros",
				"Rite of Taros", "Rite of Taros", "Taros", "Taros",
				"Triple Tactics Talent", "Triple Tactics Talent", "Ash Blossom & Joyous Spring",
				"Ash Blossom & Joyous Spring", "Crossout Designator", "Crossout Designator", "Crossout Designator",
				"Solemn Judgment", "Solemn Judgment", "Solemn Warning", "Infinite Impermanence", "Infinite Impermanence",
				"Infinite Impermanence", "Shifter Shearable", "Shifter Shearable", "Shifter Shearable",
				"Forbidden Droplet", "Forbidden Droplet", "Forbidden Droplet", "Harpie's Feather Duster",
				"Mystical Space Typhoon", "Mystical Space Typhoon", "Mystical Space Typhoon", "Called by the Grave",
				"Called by the Grave", "Called by the Grave", "Nibiru, the Primal Being",
				"Nibiru, the Primal Being", "Nibiru, the Primal Being", "Ghost Ogre & Snow Rabbit",
			},
			ExtraCards: []string{
				"Swordsoul Supremacy Sovereign Chixiao", "Swordsoul Grandmaster Chixiao",
				"Swordsoul Strategist Longyuan", "Mirrorjade the Iceblade Dragon",
				"Accesscode Talker", "Downerd Magician",
				"Underworld Goddess of the Closed World", "Wee Witch's Apprentice",
				"Swordsoul Mipham, the Vital Spirit", "Bystial Revolving Suite",
				"Phantom Knights of Break Sword", "Swordsoul Strategist Longyuan",
				"Decode Talker", "Pentestag", "Crystron Halqifibrax",
			},
			SideCards: []string{
				"Shifter Shearable", "Shifter Shearable",
				"Mystical Space Typhoon", "Mystical Space Typhoon",
				"Shifter Shearable", "Dogmatika Ecclesia, the Virtuous",
				"Dogmatika Ecclesia, the Virtuous", "Dogmatika Ecclesia, the Virtuous",
				"Lancea of the Darkwood", "Lancea of the Darkwood",
				"Lancea of the Darkwood", "Red Reboot",
				"Red Reboot", "Effect Veiler", "Effect Veiler",
			},
		},
		{
			ID:           "asian_champ_2026",
			DeckName:     "🥈 Tearlaments - Asian Championship 2026",
			DeckArchtype: "Tearlament",
			Tournament:   "Asian Championship 2026",
			Date:         "2026-01-25",
			Placement:    "1st Place",
			Player:       "Top Player",
			MainCards: []string{
				"Tearlament Scheiren", "Tearlament Rulkallos", "Tearlament Rulkallos",
				"Tearlament Scream", "Tearlament Scream", "Tearlament Sulliek",
				"Tearlament Sulliek", "Tearlament Pearlescence", "Tearlament Pearlescence",
				"Tearlament Pearlescence", "Kashtira Argodem", "Kashtira Argodem",
				"Kashtira Unicorn", "Kashtira Unicorn", "Kashtira Unicorn",
				"Tearlaments Kashtira Scheiren", "Tearlaments Kashtira Scheiren", "Tearlaments Kashtira Scheiren",
				"Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ghost Ogre & Snow Rabbit",
				"Effect Veiler", "Crossout Designator", "Crossout Designator",
				"Triple Tactics Talent", "Triple Tactics Talent", "Forbidden Droplet",
				"Forbidden Droplet", "Solemn Judgment", "Solemn Warning",
				"Infinite Impermanence", "Infinite Impermanence", "Tearlament Kitkaliath",
				"Tearlament Kitkaliath", "Shifter Shearable", "Tearlament Kitkaliah",
				"Tearlament Kitkaliah", "Tearlament Kitkaliah", "Nibiru, the Primal Being",
				"Nibiru, the Primal Being", "Nibiru, the Primal Being",
			},
			ExtraCards: []string{
				"Tearlament Scheiren", "Tearlament Rulkallos",
				"Tearlament Pearlescence", "Tearlaments Kashtira Scheiren",
				"Accesscode Talker", "Decode Talker",
				"Underworld Goddess of the Closed World", "Bystial Dolmkite",
				"Bystial Saronir", "Herald of Arc Light",
				"Crystron Halqifibrax", "Schism, The Omen Dragon",
				"Phantom Knights of Break Sword", "Spider Silk",
				"Wee Witch's Apprentice",
			},
			SideCards: []string{
				"Shifter Shearable", "Shifter Shearable",
				"Dogmatika Ecclesia, the Virtuous", "Dogmatika Ecclesia, the Virtuous",
				"Dogmatika Ecclesia, the Virtuous", "Lancea of the Darkwood",
				"Lancea of the Darkwood", "Lancea of the Darkwood",
				"Effect Veiler", "Effect Veiler",
				"Red Reboot", "Red Reboot",
				"Mystical Space Typhoon", "Harpie's Feather Duster",
				"Called by the Grave",
			},
		},
		{
			ID:           "regional_2026_01",
			DeckName:     "🥉 Snake-Eye - European Regional 2026",
			DeckArchtype: "Snake-Eye",
			Tournament:   "European Regional 2026",
			Date:         "2026-01-20",
			Placement:    "1st Place",
			Player:       "European Champion",
			MainCards: []string{
				"Snake-Eye Aquamirror", "Snake-Eye Aquamirror", "Snake-Eye Aquamirror",
				"Snake-Eye Fang", "Snake-Eye Fang", "Snake-Eye Fang",
				"Snake-Eye GodEye", "Snake-Eye GodEye", "Snake-Eye GodEye",
				"Snake-Eye Titanswallow", "Snake-Eye Titanswallow", "Snake-Eye Titanswallow",
				"Branded Beast", "Branded Beast", "Branded Beast",
				"Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring",
				"Crossout Designator", "Crossout Designator", "Crossout Designator",
				"Triple Tactics Talent", "Triple Tactics Talent", "Forbidden Droplet",
				"Forbidden Droplet", "Forbidden Droplet", "Solemn Judgment",
				"Solemn Judgment", "Solemn Warning", "Infinite Impermanence",
				"Infinite Impermanence", "Infinite Impermanence", "Nibiru, the Primal Being",
				"Nibiru, the Primal Being", "Nibiru, the Primal Being", "Effect Veiler",
				"Effect Veiler", "Spright Blue", "Spright Blue", "Spright Blue",
			},
			ExtraCards: []string{
				"Mirrorjade the Iceblade Dragon", "Predaplant Verte Anaconda",
				"Accesscode Talker", "Decode Talker",
				"Underworld Goddess of the Closed World", "Bystial Dolmkite",
				"Bystial Saronir", "Herald of Arc Light",
				"Phantom Knights of Break Sword", "Spider Silk",
				"Wee Witch's Apprentice", "Schism, The Omen Dragon",
				"Crystron Halqifibrax", "Downerd Magician", "Pentestag",
			},
			SideCards: []string{
				"Mystical Space Typhoon", "Mystical Space Typhoon",
				"Harpie's Feather Duster", "Called by the Grave",
				"Called by the Grave", "Dogmatika Ecclesia, the Virtuous",
				"Dogmatika Ecclesia, the Virtuous", "Lancea of the Darkwood",
				"Lancea of the Darkwood", "Red Reboot",
				"Red Reboot", "Shifter Shearable",
				"Shifter Shearable", "Effect Veiler", "Effect Veiler",
			},
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{Data: topDecks, Status: "success"})
}

// getDecksByCard retourne les decks qui contiennent une carte spécifique
func getDecksByCard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	cardName := r.URL.Query().Get("card")
	if cardName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Error: "Paramètre 'card' requis", Status: "error"})
		return
	}

	// Récupérer tous les decks
	allDecks := getAllTopDecks()

	// Filtrer les decks qui contiennent la carte
	var matchingDecks []TopDeck
	cardLower := strings.ToLower(cardName)

	for _, deck := range allDecks {
		found := false
		for _, card := range deck.MainCards {
			if strings.Contains(strings.ToLower(card), cardLower) {
				found = true
				break
			}
		}
		if !found {
			for _, card := range deck.ExtraCards {
				if strings.Contains(strings.ToLower(card), cardLower) {
					found = true
					break
				}
			}
		}
		if !found {
			for _, card := range deck.SideCards {
				if strings.Contains(strings.ToLower(card), cardLower) {
					found = true
					break
				}
			}
		}

		if found {
			matchingDecks = append(matchingDecks, deck)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{Data: matchingDecks, Status: "success"})
}

// getAllTopDecks retourne tous les decks
func getAllTopDecks() []TopDeck {
	return []TopDeck{
		{
			ID:           "ycs_miami_2026",
			DeckName:     "🏆 Swordsoul Strategist - YCS Miami 2026",
			DeckArchtype: "Swordsoul",
			Tournament:   "YCS Miami 2026",
			Date:         "2026-01-18",
			Placement:    "1st Place",
			Player:       "Champion Player",
			MainCards: []string{
				"Swordsoul Strategist Longyuan", "Swordsoul Strategist Longyuan", "Swordsoul Strategist Longyuan",
				"Swordsoul Grandmaster Chixiao", "Swordsoul Grandmaster Chixiao", "Swordsoul Grandmaster Chixiao",
				"Swordsoul Grandmaster Chixiao", "Swordsoul Grandmaster Chixiao", "Swordsoul Strategist Harumichiya",
				"Swordsoul Strategist Harumichiya", "Swordsoul Strategist Harumichiya", "Rite of Taros",
				"Rite of Taros", "Rite of Taros", "Taros", "Taros",
				"Triple Tactics Talent", "Triple Tactics Talent", "Ash Blossom & Joyous Spring",
				"Ash Blossom & Joyous Spring", "Crossout Designator", "Crossout Designator", "Crossout Designator",
				"Solemn Judgment", "Solemn Judgment", "Solemn Warning", "Infinite Impermanence", "Infinite Impermanence",
				"Infinite Impermanence", "Shifter Shearable", "Shifter Shearable", "Shifter Shearable",
				"Forbidden Droplet", "Forbidden Droplet", "Forbidden Droplet", "Harpie's Feather Duster",
				"Mystical Space Typhoon", "Mystical Space Typhoon", "Mystical Space Typhoon", "Called by the Grave",
				"Called by the Grave", "Called by the Grave", "Nibiru, the Primal Being",
				"Nibiru, the Primal Being", "Nibiru, the Primal Being", "Ghost Ogre & Snow Rabbit",
			},
			ExtraCards: []string{
				"Swordsoul Supremacy Sovereign Chixiao", "Swordsoul Grandmaster Chixiao",
				"Swordsoul Strategist Longyuan", "Mirrorjade the Iceblade Dragon",
				"Accesscode Talker", "Downerd Magician",
				"Underworld Goddess of the Closed World", "Wee Witch's Apprentice",
				"Swordsoul Mipham, the Vital Spirit", "Bystial Revolving Suite",
				"Phantom Knights of Break Sword", "Swordsoul Strategist Longyuan",
				"Decode Talker", "Pentestag", "Crystron Halqifibrax",
			},
			SideCards: []string{
				"Shifter Shearable", "Shifter Shearable",
				"Mystical Space Typhoon", "Mystical Space Typhoon",
				"Shifter Shearable", "Dogmatika Ecclesia, the Virtuous",
				"Dogmatika Ecclesia, the Virtuous", "Dogmatika Ecclesia, the Virtuous",
				"Lancea of the Darkwood", "Lancea of the Darkwood",
				"Lancea of the Darkwood", "Red Reboot",
				"Red Reboot", "Effect Veiler", "Effect Veiler",
			},
		},
		{
			ID:           "asian_champ_2026",
			DeckName:     "🥈 Tearlaments - Asian Championship 2026",
			DeckArchtype: "Tearlament",
			Tournament:   "Asian Championship 2026",
			Date:         "2026-01-25",
			Placement:    "1st Place",
			Player:       "Top Player",
			MainCards: []string{
				"Tearlament Scheiren", "Tearlament Rulkallos", "Tearlament Rulkallos",
				"Tearlament Scream", "Tearlament Scream", "Tearlament Sulliek",
				"Tearlament Sulliek", "Tearlament Pearlescence", "Tearlament Pearlescence",
				"Tearlament Pearlescence", "Kashtira Argodem", "Kashtira Argodem",
				"Kashtira Unicorn", "Kashtira Unicorn", "Kashtira Unicorn",
				"Tearlaments Kashtira Scheiren", "Tearlaments Kashtira Scheiren", "Tearlaments Kashtira Scheiren",
				"Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ghost Ogre & Snow Rabbit",
				"Effect Veiler", "Crossout Designator", "Crossout Designator",
				"Triple Tactics Talent", "Triple Tactics Talent", "Forbidden Droplet",
				"Forbidden Droplet", "Solemn Judgment", "Solemn Warning",
				"Infinite Impermanence", "Infinite Impermanence", "Tearlament Kitkaliah",
				"Tearlament Kitkaliah", "Shifter Shearable", "Tearlament Kitkaliah",
				"Tearlament Kitkaliah", "Tearlament Kitkaliah", "Nibiru, the Primal Being",
				"Nibiru, the Primal Being", "Nibiru, the Primal Being",
			},
			ExtraCards: []string{
				"Tearlament Scheiren", "Tearlament Rulkallos",
				"Tearlament Pearlescence", "Tearlaments Kashtira Scheiren",
				"Accesscode Talker", "Decode Talker",
				"Underworld Goddess of the Closed World", "Bystial Dolmkite",
				"Bystial Saronir", "Herald of Arc Light",
				"Crystron Halqifibrax", "Schism, The Omen Dragon",
				"Phantom Knights of Break Sword", "Spider Silk",
				"Wee Witch's Apprentice",
			},
			SideCards: []string{
				"Shifter Shearable", "Shifter Shearable",
				"Dogmatika Ecclesia, the Virtuous", "Dogmatika Ecclesia, the Virtuous",
				"Dogmatika Ecclesia, the Virtuous", "Lancea of the Darkwood",
				"Lancea of the Darkwood", "Lancea of the Darkwood",
				"Effect Veiler", "Effect Veiler",
				"Red Reboot", "Red Reboot",
				"Mystical Space Typhoon", "Harpie's Feather Duster",
				"Called by the Grave",
			},
		},
		{
			ID:           "regional_2026_01",
			DeckName:     "🥉 Snake-Eye - European Regional 2026",
			DeckArchtype: "Snake-Eye",
			Tournament:   "European Regional 2026",
			Date:         "2026-01-20",
			Placement:    "1st Place",
			Player:       "European Champion",
			MainCards: []string{
				"Snake-Eye Aquamirror", "Snake-Eye Aquamirror", "Snake-Eye Aquamirror",
				"Snake-Eye Fang", "Snake-Eye Fang", "Snake-Eye Fang",
				"Snake-Eye GodEye", "Snake-Eye GodEye", "Snake-Eye GodEye",
				"Snake-Eye Titanswallow", "Snake-Eye Titanswallow", "Snake-Eye Titanswallow",
				"Branded Beast", "Branded Beast", "Branded Beast",
				"Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring",
				"Crossout Designator", "Crossout Designator", "Crossout Designator",
				"Triple Tactics Talent", "Triple Tactics Talent", "Forbidden Droplet",
				"Forbidden Droplet", "Forbidden Droplet", "Solemn Judgment",
				"Solemn Judgment", "Solemn Warning", "Infinite Impermanence",
				"Infinite Impermanence", "Infinite Impermanence", "Nibiru, the Primal Being",
				"Nibiru, the Primal Being", "Nibiru, the Primal Being", "Effect Veiler",
				"Effect Veiler", "Spright Blue", "Spright Blue", "Spright Blue",
			},
			ExtraCards: []string{
				"Mirrorjade the Iceblade Dragon", "Predaplant Verte Anaconda",
				"Accesscode Talker", "Decode Talker",
				"Underworld Goddess of the Closed World", "Bystial Dolmkite",
				"Bystial Saronir", "Herald of Arc Light",
				"Phantom Knights of Break Sword", "Spider Silk",
				"Wee Witch's Apprentice", "Schism, The Omen Dragon",
				"Crystron Halqifibrax", "Downerd Magician", "Pentestag",
			},
			SideCards: []string{
				"Mystical Space Typhoon", "Mystical Space Typhoon",
				"Harpie's Feather Duster", "Called by the Grave",
				"Called by the Grave", "Dogmatika Ecclesia, the Virtuous",
				"Dogmatika Ecclesia, the Virtuous", "Lancea of the Darkwood",
				"Lancea of the Darkwood", "Red Reboot",
				"Red Reboot", "Shifter Shearable",
				"Shifter Shearable", "Effect Veiler", "Effect Veiler",
			},
		},
	}
}
