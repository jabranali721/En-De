let vocabDatabase = []; // Qui carichiamo il CSV
let currentCard = null;
let userStats = JSON.parse(localStorage.getItem('deutschStats')) || {}; 
// Esempio struttura userStats: { "Cane": { level: 1, nextReview: 17000000000 } }

const fileInput = document.getElementById('csvFile');
const gamePanel = document.getElementById('game-panel');
const setupPanel = document.getElementById('setup-panel');
const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answer-input');
const feedback = document.getElementById('feedback');
const checkBtn = document.getElementById('check-btn');
const statsBtn = document.getElementById('stats-btn');
const statsPanel = document.getElementById('stats-panel');
const closeStatsBtn = document.getElementById('close-stats-btn');

// 1. CARICAMENTO CSV
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const text = event.target.result;
        parseCSV(text);
        setupPanel.classList.add('hidden');
        gamePanel.classList.remove('hidden');
        nextCard();
    };
    
    reader.readAsText(file);
});

function parseCSV(text) {
    // Divide per righe e poi per punto e virgola
    const lines = text.split('\n');
    vocabDatabase = lines.map(line => {
        const parts = line.split(';');
        if(parts.length >= 2) {
            return { q: parts[0].trim(), a: parts[1].trim() };
        }
    }).filter(item => item); // Rimuove righe vuote
}

// 2. LOGICA DI SELEZIONE (ALGORITMO SRS)
function nextCard() {
    answerInput.value = '';
    feedback.classList.add('hidden');
    feedback.className = ''; 
    
    // Algoritmo Spaced Repetition: privilegia parole con livello basso
    // Box 1: level 0 (nuove o sbagliate)
    // Box 2: level 1 (indovinate 1 volta)
    // Box 3: level 2+ (indovinate 2+ volte)
    
    const now = Date.now();
    const candidates = vocabDatabase.filter(c => {
        const stat = userStats[c.q];
        if (!stat) return true; // Nuova parola
        
        // Controlla se è il momento di rivedere questa parola
        const nextReview = stat.nextReview || 0;
        return now >= nextReview;
    });
    
    if (candidates.length === 0) {
        // Tutte le parole sono state ripassate recentemente
        // Prendi quella con il livello più basso
        const sorted = vocabDatabase.sort((a, b) => {
            const levelA = userStats[a.q]?.level || 0;
            const levelB = userStats[b.q]?.level || 0;
            return levelA - levelB;
        });
        currentCard = sorted[0];
    } else {
        // Priorità alle parole con livello basso
        candidates.sort((a, b) => {
            const levelA = userStats[a.q]?.level || 0;
            const levelB = userStats[b.q]?.level || 0;
            if (levelA !== levelB) return levelA - levelB;
            return Math.random() - 0.5; // Random se stesso livello
        });
        currentCard = candidates[0];
    }

    questionText.textContent = currentCard.q;
    answerInput.focus();
    updateLevelDisplay();
}

// 3. CONTROLLO E GAMIFICATION
checkBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

function checkAnswer() {
    const userVal = answerInput.value.trim().toLowerCase();
    const correctVal = currentCard.a.trim().toLowerCase();
    
    // Inizializza stats se non esistono per questa parola
    if (!userStats[currentCard.q]) {
        userStats[currentCard.q] = { level: 0, streak: 0 };
    }

    if (userVal === correctVal) {
        // CORRETTO
        feedback.textContent = "✅ Richtig! (" + currentCard.a + ")";
        feedback.classList.remove('hidden');
        feedback.classList.add('success');
        
        // Gamification: Aumenta livello e streak
        userStats[currentCard.q].level += 1;
        userStats[currentCard.q].streak += 1;
        
        // Calcola prossima revisione basata sul livello (Spaced Repetition)
        const level = userStats[currentCard.q].level;
        let daysUntilReview;
        if (level === 1) {
            daysUntilReview = 1; // Box 1: domani
        } else if (level === 2) {
            daysUntilReview = 3; // Box 2: tra 3 giorni
        } else if (level === 3) {
            daysUntilReview = 7; // Box 3: tra 7 giorni
        } else {
            daysUntilReview = level * 7; // Aumenta progressivamente
        }
        
        userStats[currentCard.q].nextReview = Date.now() + (daysUntilReview * 24 * 60 * 60 * 1000);
        
        updateGlobalStreak(true);
        
        // Confetti per streak di 5
        const currentStreak = parseInt(document.getElementById('streak').textContent);
        if (currentStreak % 5 === 0 && currentStreak > 0) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
    } else {
        // SBAGLIATO
        feedback.textContent = "❌ Falsch! Era: " + currentCard.a;
        feedback.classList.remove('hidden');
        feedback.classList.add('error');
        
        // Penalità: Reset livello (torna a Box 1)
        userStats[currentCard.q].level = 0; 
        userStats[currentCard.q].streak = 0;
        userStats[currentCard.q].nextReview = Date.now(); // Ripeti subito
        updateGlobalStreak(false);
    }

    // Salva nel "Database" (LocalStorage)
    localStorage.setItem('deutschStats', JSON.stringify(userStats));
    
    // Dopo 2 secondi, prossima carta
    setTimeout(nextCard, 2000);
}

function updateGlobalStreak(isCorrect) {
    const streakEl = document.getElementById('streak');
    let current = parseInt(streakEl.textContent);
    streakEl.textContent = isCorrect ? current + 1 : 0;
}

function updateLevelDisplay() {
    // Calcola il livello medio delle parole studiate
    const studiedWords = Object.keys(userStats);
    if (studiedWords.length === 0) {
        document.getElementById('level').textContent = '1';
        return;
    }
    
    const totalLevel = studiedWords.reduce((sum, word) => {
        return sum + (userStats[word].level || 0);
    }, 0);
    
    const avgLevel = Math.floor(totalLevel / studiedWords.length) + 1;
    document.getElementById('level').textContent = avgLevel;
}

// 4. STATISTICHE
statsBtn.addEventListener('click', showStats);
closeStatsBtn.addEventListener('click', () => {
    statsPanel.classList.add('hidden');
});

function showStats() {
    const masteredDiv = document.getElementById('mastered-words');
    const criticalDiv = document.getElementById('critical-words');
    const allWordsDiv = document.getElementById('all-words');
    
    // Clear previous content
    masteredDiv.innerHTML = '';
    criticalDiv.innerHTML = '';
    allWordsDiv.innerHTML = '';
    
    // Get all words with stats
    const wordsWithStats = vocabDatabase.map(word => {
        const stat = userStats[word.q] || { level: 0, streak: 0 };
        return {
            italian: word.q,
            german: word.a,
            level: stat.level,
            streak: stat.streak
        };
    });
    
    // Sort by level (descending)
    wordsWithStats.sort((a, b) => b.level - a.level);
    
    // Parole Masterizzate (Livello > 5)
    const mastered = wordsWithStats.filter(w => w.level > 5);
    if (mastered.length === 0) {
        masteredDiv.innerHTML = '<div class="empty-message">Nessuna parola masterizzata ancora. Continua così! 💪</div>';
    } else {
        mastered.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-item mastered';
            div.innerHTML = `
                <span class="word-text">${word.italian} → ${word.german}</span>
                <span class="word-level">Livello ${word.level}</span>
            `;
            masteredDiv.appendChild(div);
        });
    }
    
    // Parole Critiche (Livello 0)
    const critical = wordsWithStats.filter(w => w.level === 0);
    if (critical.length === 0) {
        criticalDiv.innerHTML = '<div class="empty-message">Nessuna parola critica! Ottimo lavoro! 🎉</div>';
    } else {
        critical.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-item critical';
            div.innerHTML = `
                <span class="word-text">${word.italian} → ${word.german}</span>
                <span class="word-level">Livello ${word.level}</span>
            `;
            criticalDiv.appendChild(div);
        });
    }
    
    // Tutte le Parole
    wordsWithStats.forEach(word => {
        const div = document.createElement('div');
        div.className = 'word-item';
        div.innerHTML = `
            <span class="word-text">${word.italian} → ${word.german}</span>
            <span class="word-level">Livello ${word.level}</span>
        `;
        allWordsDiv.appendChild(div);
    });
    
    statsPanel.classList.remove('hidden');
}

// Close stats panel when clicking outside
statsPanel.addEventListener('click', (e) => {
    if (e.target === statsPanel) {
        statsPanel.classList.add('hidden');
    }
});
