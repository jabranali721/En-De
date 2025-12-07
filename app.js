let library = {}; // Conterrà tutti i moduli: { "pane": [...], "viaggi": [...] }
let currentList = []; // Il modulo che stai giocando ora
let currentCard = null;
let userStats = JSON.parse(localStorage.getItem('deutschStats')) || {};

// Elementi DOM
const folderInput = document.getElementById('folderInput');
const dashboardPanel = document.getElementById('dashboard-panel');
const gamePanel = document.getElementById('game-panel');
const setupPanel = document.getElementById('setup-panel');
const modulesGrid = document.getElementById('modules-grid');
const homeBtn = document.getElementById('home-btn');

// --- 1. CARICAMENTO CARTELLA ---
folderInput.addEventListener('change', async function(e) {
    const files = e.target.files;
    library = {}; // Reset libreria
    
    // Processiamo tutti i file caricati
    for (let file of files) {
        if (file.name.endsWith('.csv')) {
            const text = await readFile(file); // Funzione helper sotto
            const moduleName = file.name.replace('.csv', '').replace(/_/g, ' '); // Pulisce il nome
            const words = parseCSV(text);
            if (words.length > 0) {
                library[moduleName] = words;
            }
        }
    }
    
    showDashboard();
});

// Helper per leggere file (Promise wrapper)
function readFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
    });
}

function parseCSV(text) {
    return text.split('\n')
        .map(line => {
            const parts = line.split(';');
            return (parts.length >= 2) ? { q: parts[0].trim(), a: parts[1].trim() } : null;
        })
        .filter(item => item);
}

// --- 2. DASHBOARD ---
function showDashboard() {
    setupPanel.classList.add('hidden');
    gamePanel.classList.add('hidden');
    dashboardPanel.classList.remove('hidden');
    homeBtn.classList.remove('hidden');

    modulesGrid.innerHTML = '';
    
    // Crea un bottone per ogni categoria trovata
    Object.keys(library).forEach(moduleName => {
        const btn = document.createElement('button');
        btn.className = 'module-card';
        // Aggiungi conteggio parole (es. "Supermercato (20)")
        btn.textContent = `${moduleName.toUpperCase()} (${library[moduleName].length})`;
        btn.onclick = () => startGame(moduleName);
        modulesGrid.appendChild(btn);
    });
}

// --- 3. GIOCO ---
function startGame(moduleName) {
    currentList = library[moduleName];
    dashboardPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    document.getElementById('current-module-title').textContent = "Modulo: " + moduleName;
    nextCard();
}

// Logica carta successiva (con filtro priorità)
function nextCard() {
    document.getElementById('feedback').className = 'hidden';
    document.getElementById('answer-input').value = '';
    
    // Algoritmo: Mischia e cerca parole con livello basso o mai viste
    const shuffled = [...currentList].sort(() => 0.5 - Math.random());
    
    currentCard = shuffled.find(card => {
        const stat = userStats[card.q];
        // Se non esiste stat o livello < 3, ha priorità
        return !stat || stat.level < 3;
    }) || shuffled[0]; // Altrimenti prendine una a caso

    // Aggiorna UI
    document.getElementById('question-text').textContent = currentCard.q;
    
    const stat = userStats[currentCard.q] || { level: 0 };
    document.getElementById('word-level').textContent = stat.level;
    
    document.getElementById('answer-input').focus();
}

// --- 4. CONTROLLO ---
document.getElementById('check-btn').addEventListener('click', checkAnswer);
document.getElementById('answer-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') checkAnswer();
});

function checkAnswer() {
    const input = document.getElementById('answer-input');
    const feedback = document.getElementById('feedback');
    const userVal = input.value.trim().toLowerCase();
    const correctVal = currentCard.a.trim().toLowerCase();

    if (!userStats[currentCard.q]) userStats[currentCard.q] = { level: 0, tries: 0 };
    userStats[currentCard.q].tries++;

    if (userVal === correctVal) {
        feedback.textContent = "✅ Esatto!";
        feedback.className = 'success';
        if(userStats[currentCard.q].level < 5) userStats[currentCard.q].level++;
    } else {
        feedback.textContent = `❌ No! Era: ${currentCard.a}`;
        feedback.className = 'error';
        userStats[currentCard.q].level = 0; // Reset se sbagli
    }

    localStorage.setItem('deutschStats', JSON.stringify(userStats));
    setTimeout(nextCard, 2000); // Attendi 2 secondi
}

// Tasto Home
homeBtn.addEventListener('click', showDashboard);
