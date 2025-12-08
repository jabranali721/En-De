let library = {}; // Conterrà tutti i moduli: { "pane": [...], "viaggi": [...] }
let currentList = []; // Il modulo che stai giocando ora
let currentCard = null;
let userStats = JSON.parse(localStorage.getItem('deutschStats')) || {};
let sessionCorrectCount = 0; // Quante ne hai fatte giuste in questa sessione
let sessionTotalGoal = 10;   // Obiettivo: fare 10 parole giuste per finire il "round"
let hintIndex = 0; // Variabile globale per tracciare quanti aiuti usati
let studyIndex = 0;
let isStudyMode = false;
let isDictationMode = false;
let currentSpeed = 1.0; // Velocità di default

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
    document.getElementById('study-panel').classList.add('hidden');
    dashboardPanel.classList.remove('hidden');
    
    // Reset mode flags
    isDictationMode = false;
    isStudyMode = false;
    
    // Nascondi XP bar e ripristina titolo
    document.getElementById('xp-bar-container').classList.add('hidden');
    document.getElementById('current-mode').textContent = 'Select Mode';
    document.getElementById('speed-controls').classList.add('hidden');

    modulesGrid.innerHTML = '';
    
    // Crea un bottone per ogni categoria trovata
    Object.keys(library).forEach(moduleName => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "10px";

        // Bottone Modulo (Avvia Gioco)
        const btnPlay = document.createElement('button');
        btnPlay.className = 'module-card';
        btnPlay.innerHTML = `🎮 PLAY: ${moduleName.toUpperCase()}`;
        btnPlay.onclick = () => startGame(moduleName);

        // Bottone Studio (Piccolo accanto)
        const btnStudy = document.createElement('button');
        btnStudy.className = 'module-card';
        btnStudy.style.borderLeft = "2px solid #555"; 
        btnStudy.innerHTML = `📖 STUDY`;
        btnStudy.onclick = () => startStudy(moduleName);

        // Bottone Dettato (Icona Cuffie)
        const btnDictation = document.createElement('button');
        btnDictation.className = 'module-card';
        btnDictation.style.borderLeft = "2px solid #555"; 
        btnDictation.innerHTML = `🎧 DICTATION`;
        btnDictation.onclick = () => startDictation(moduleName);

        wrapper.appendChild(btnPlay);
        wrapper.appendChild(btnStudy);
        wrapper.appendChild(btnDictation);
        modulesGrid.appendChild(wrapper);
    });
}

// --- 3. GIOCO ---
function startGame(moduleName) {
    currentList = library[moduleName];
    isDictationMode = false;
    isStudyMode = false;
    dashboardPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    
    // AGGIUNTA: Aggiorna il titolo nella navbar e mostra XP bar
    document.getElementById('current-mode').textContent = moduleName; 
    document.getElementById('xp-bar-container').classList.remove('hidden');
    
    // Nascondi controlli velocità in modalità normale
    document.getElementById('speed-controls').classList.add('hidden');
    
    // Inizializza sessione
    sessionCorrectCount = 0;
    updateProgressBar();
    
    nextCard();
}

// Logica carta successiva (con filtro priorità)
function nextCard() {
    document.getElementById('feedback').className = 'hidden';
    const input = document.getElementById('answer-input');
    input.value = '';
    
    // Reset hint
    hintIndex = 0;
    input.placeholder = '';
    
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

    const questionText = document.getElementById('question-text');

    if (isDictationMode) {
        // --- MODALITÀ DETTATO ---
        questionText.textContent = "🎧 Ascolta..."; 
        questionText.style.color = "var(--sub-color)";
        questionText.style.opacity = "0.5";
        
        // Parla automaticamente dopo un breve ritardo (per dare tempo di resettare)
        setTimeout(() => speak(currentCard.a), 500);
        
    } else {
        // --- MODALITÀ CLASSICA ---
        questionText.textContent = currentCard.q; // Mostra Italiano
        questionText.style.color = "var(--sub-color)";
        questionText.style.opacity = "1";
        // In modalità classica NON parliamo all'inizio, solo alla fine
    }
    
    input.focus();
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
        let msg = `✅ Esatto!`;
        
        // Se eravamo in dettato, mostriamo ora la traduzione italiana
        if (isDictationMode) {
            msg += ` <span style="color:#aaa; font-size:0.8em">(${currentCard.q})</span>`;
        }
        
        const escapedAnswer = currentCard.a.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        msg += ` <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>`;
        feedback.innerHTML = msg;
        feedback.className = 'success';
        
        // Flash verde
        input.classList.add('flash-correct');
        setTimeout(() => input.classList.remove('flash-correct'), 500);
        
        // Aumenta livello (max 5)
        if(userStats[currentCard.q].level < 5) userStats[currentCard.q].level++;
        
        // XP System
        let currentXP = parseInt(localStorage.getItem('deutschXP') || '0');
        currentXP += 10; // 10 XP per parola
        localStorage.setItem('deutschXP', currentXP);
        
        sessionCorrectCount++;
        updateProgressBar();
        updateRank(currentXP);
        
        // Parla in automatico quando indovini
        speak(currentCard.a);
        
        saveAndNext();
        
    } else {
        // --- CASO SBAGLIATO ---
        // Shake animation
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 300);
        
        // Mostriamo errore MA con opzione di "Recupero"
        let msg = `❌ No! Era: <b>${currentCard.a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</b>`;
        
        if (isDictationMode) {
             msg += ` <br><span style="color:#aaa">Traduzione: ${currentCard.q}</span>`;
        }
        
        const escapedAnswer = currentCard.a.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        msg += ` <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>
            <br>
            <button id="override-btn" class="override-btn">Wait, I was right (Typo)</button>`;
        
        feedback.innerHTML = msg;
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
    msg.rate = currentSpeed; // USA LA VELOCITÀ VARIABILE
    
    window.speechSynthesis.speak(msg);
}

// --- FUNZIONI HELPER PER XP E PROGRESS BAR ---
function updateProgressBar() {
    const percentage = (sessionCorrectCount / sessionTotalGoal) * 100;
    document.getElementById('progress-fill').style.width = Math.min(percentage, 100) + '%';
    document.getElementById('total-xp').textContent = localStorage.getItem('deutschXP') || 0;
}

function updateRank(xp) {
    // Calcolo livello semplice: ogni 100 XP sali di livello
    const lvl = Math.floor(xp / 100) + 1;
    document.getElementById('user-rank').textContent = lvl;
}

// --- FUNZIONE HINT ---
function showHint() {
    const answer = currentCard.a;
    // Mostra un pezzo in più della parola ogni volta
    hintIndex++;
    
    // Esempio: "Katze" -> hint 1: "K....", hint 2: "Ka..."
    const revealed = answer.substring(0, hintIndex);
    const hidden = answer.substring(hintIndex).replace(/./g, '.'); // Sostituisce il resto con punti
    
    // Mettiamolo nel placeholder così l'utente ci scrive sopra
    document.getElementById('answer-input').placeholder = revealed + hidden;
    
    // Feedback visivo che stai barando
    document.getElementById('feedback').textContent = "👀 Hint usato...";
    document.getElementById('feedback').className = 'sub-label';
}

// --- TAB KEY LISTENER ---
document.getElementById('answer-input').addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault(); // Non cambiare focus
        showHint();
    }
});

// --- GERMAN KEYBOARD FUNCTION ---
function insertChar(char) {
    // Input validation
    if (!char || typeof char !== 'string') return;
    
    const input = document.getElementById('answer-input');
    if (!input) return;
    
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    // Insert character at cursor position
    input.value = text.substring(0, start) + char + text.substring(end);
    
    // Move cursor after inserted character (handle multi-byte characters)
    input.selectionStart = input.selectionEnd = start + char.length;
    
    // Keep focus on input
    input.focus();
}

// --- DICTATION MODE FUNCTIONS ---

function startDictation(moduleName) {
    currentList = library[moduleName];
    isDictationMode = true;
    isStudyMode = false;
    
    // UI Setup
    dashboardPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    document.getElementById('xp-bar-container').classList.remove('hidden');
    document.getElementById('current-mode').textContent = moduleName + " (Dictation)";
    
    // Mostra controlli velocità
    document.getElementById('speed-controls').classList.remove('hidden');
    
    // Inizializza sessione
    sessionCorrectCount = 0;
    updateProgressBar();
    
    nextCard();
}

function setSpeed(rate) {
    currentSpeed = rate;
    
    // Aggiorna UI bottoni
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnRate = parseFloat(btn.getAttribute('data-rate'));
        if (btnRate === rate) {
            btn.classList.add('active');
        }
    });
    
    // Riproduci subito per far sentire la differenza
    if (currentCard) speak(currentCard.a); 
}

function replayAudio() {
    if (currentCard) speak(currentCard.a);
    document.getElementById('answer-input').focus();
}

// --- LOGICA STUDY MODE ---

function startStudy(moduleName) {
    currentList = library[moduleName];
    studyIndex = 0;
    isStudyMode = true;
    isDictationMode = false;

    // Gestione UI
    dashboardPanel.classList.add('hidden');
    document.getElementById('study-panel').classList.remove('hidden');
    
    loadStudyCard();
}

function loadStudyCard() {
    const card = currentList[studyIndex];
    const questionEl = document.getElementById('study-question');
    const answerEl = document.getElementById('study-answer');
    const answerBox = document.getElementById('study-answer-box');

    // Reset grafica
    questionEl.textContent = card.q;
    answerEl.textContent = card.a;
    answerBox.classList.remove('reveal');
    answerBox.classList.add('hidden-content');
}

function revealCard() {
    const answerBox = document.getElementById('study-answer-box');
    // Se è già rivelato, non fare nulla
    if (answerBox.classList.contains('reveal')) return;

    answerBox.classList.remove('hidden-content');
    answerBox.classList.add('reveal');
    
    // Parla in automatico
    speak(currentList[studyIndex].a);
}

function nextStudyCard() {
    if (studyIndex < currentList.length - 1) {
        studyIndex++;
        loadStudyCard();
    } else {
        // Fine mazzo -> ricomincia o avvisa
        studyIndex = 0; // Loop infinito
        loadStudyCard();
    }
}

function prevStudyCard() {
    if (studyIndex > 0) {
        studyIndex--;
        loadStudyCard();
    }
}

// Event Listener Globale per tastiera (gestisce sia Gioco che Studio)
document.addEventListener('keydown', (e) => {
    if (!isStudyMode) return; // Se stiamo giocando, ignora questi comandi

    if (e.code === 'Space') {
        e.preventDefault(); // Evita scroll pagina
        revealCard();
    } else if (e.code === 'ArrowRight') {
        nextStudyCard();
    } else if (e.code === 'ArrowLeft') {
        prevStudyCard();
    }
});

// Tasto Esci
document.getElementById('exit-study-btn').addEventListener('click', () => {
    isStudyMode = false;
    document.getElementById('study-panel').classList.add('hidden');
    showDashboard();
});
