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
            try {
                const text = await readFile(file);
                const moduleName = file.name.replace('.csv', '').replace(/_/g, ' ');
                const words = parseCSV(text);
                if (words.length > 0) {
                    library[moduleName] = words;
                }
            } catch (error) {
                console.error(`Errore nel caricamento di ${file.name}:`, error);
                // Continua con gli altri file
            }
        }
    }
    
    if (Object.keys(library).length === 0) {
        alert('Nessun file CSV valido trovato nella cartella!');
        return;
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
    
    // Nascondi stats e ripristina titolo
    document.getElementById('top-stats').classList.add('hidden');
    document.getElementById('current-mode').textContent = 'Select Mode';

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
    
    // AGGIUNTA: Aggiorna il titolo nella navbar e mostra stats
    document.getElementById('current-mode').textContent = moduleName; 
    document.getElementById('top-stats').classList.remove('hidden');
    
    nextCard();
}

// Logica carta successiva (con filtro priorità)
function nextCard() {
    document.getElementById('feedback').className = 'hidden';
    document.getElementById('answer-input').value = '';
    
    // Algoritmo: Fisher-Yates shuffle per randomizzazione corretta
    const shuffled = [...currentList];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
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

    // Aggiorna tentativi
    if (!userStats[currentCard.q]) userStats[currentCard.q] = { level: 0, tries: 0 };
    userStats[currentCard.q].tries++;

    if (userVal === correctVal) {
        // --- CASO CORRETTO ---
        const escapedAnswer = currentCard.a.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        feedback.innerHTML = `✅ Esatto! <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>`;
        feedback.className = 'success';
        
        // Aumenta livello (max 5)
        if(userStats[currentCard.q].level < 5) userStats[currentCard.q].level++;
        
        // Parla in automatico quando indovini
        speak(currentCard.a);
        
        saveAndNext();
        
    } else {
        // --- CASO SBAGLIATO ---
        // Mostriamo errore MA con opzione di "Recupero"
        const escapedAnswer = currentCard.a.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        const displayAnswer = currentCard.a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        feedback.innerHTML = `
            ❌ No! Era: <b>${displayAnswer}</b> 
            <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>
            <br>
            <button id="override-btn" class="override-btn">Wait, I was right (Typo)</button>
        `;
        feedback.className = 'error';
        
        // Parla anche se sbagli, così impari la pronuncia
        speak(currentCard.a);

        // Penalità temporanea (verrà salvata solo se non clicchi override)
        const oldLevel = userStats[currentCard.q].level; // Salviamo il livello vecchio per sicurezza
        userStats[currentCard.q].level = 0; 
        localStorage.setItem('deutschStats', JSON.stringify(userStats));

        // Gestione Click su "I was right"
        document.getElementById('override-btn').onclick = function() {
            // Ripristina e aumenta come se fosse giusto
            userStats[currentCard.q].level = oldLevel < 5 ? oldLevel + 1 : 5;
            feedback.innerHTML = `✅ Corretto manualmente!`;
            feedback.className = 'success';
            saveAndNext();
        };

        // Se l'utente NON clicca override, andiamo avanti tra 3 secondi (più tempo per leggere l'errore)
        window.tempTimeout = setTimeout(nextCard, 3000);
    }
}

function saveAndNext() {
    localStorage.setItem('deutschStats', JSON.stringify(userStats));
    // Se c'era un timeout pendente (dal caso errore), cancellalo
    if(window.tempTimeout) clearTimeout(window.tempTimeout);
    setTimeout(nextCard, 2000);
}

// Tasto Home
homeBtn.addEventListener('click', showDashboard);

// --- FUNZIONE AUDIO ---
function speak(text) {
    // Controlla supporto browser
    if (!window.speechSynthesis) {
        console.warn('Speech Synthesis API non supportata in questo browser');
        return;
    }
    
    // Interrompi se sta già parlando
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'de-DE'; // Imposta lingua tedesca
    msg.rate = 0.9;     // Velocità leggermente ridotta per chiarezza
    
    window.speechSynthesis.speak(msg);
}
