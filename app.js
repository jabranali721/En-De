/**
 * DEUTSCH TYPE - APP.JS 2.0 (Refactored)
 * Gestisce: Classico, Quiz, Story, Dettato, Studio
 */

// --- STATO GLOBALE DELL'APP ---
const APP_STATE = {
    currentMode: 'NORMAL', // 'NORMAL', 'QUIZ', 'STORY', 'DICTATION', 'STUDY'
    library: {},           // Contiene tutti i moduli caricati
    currentList: [],       // Lista parole attiva
    currentCard: null,     // Carta corrente
    stats: JSON.parse(localStorage.getItem('deutschStats')) || {}, // Statistiche salvate
    storyVars: {},         // Variabili dinamiche per le storie ({nome}, {citta})
    storyIndex: 0,         // Indice progressivo per le storie
    studyIndex: 0,         // Indice per study mode
    hintIndex: 0,          // Indice per hint
    sessionCorrect: 0,
    sessionGoal: 10,
    speed: 1.0
};

// --- ELEMENTI DOM (Cache) ---
const DOM = {
    panels: {
        setup: document.getElementById('setup-panel'),
        dashboard: document.getElementById('dashboard-panel'),
        game: document.getElementById('game-panel'),
        study: document.getElementById('study-panel')
    },
    game: {
        question: document.getElementById('question-text'),
        input: document.getElementById('answer-input'),
        quizContainer: document.getElementById('quiz-buttons'),
        feedback: document.getElementById('feedback'),
        checkBtn: document.getElementById('check-btn'),
        speedControls: document.getElementById('speed-controls'),
        virtualKeyboard: document.querySelector('.german-keyboard')
    },
    nav: {
        modeLabel: document.getElementById('current-mode'),
        xpContainer: document.getElementById('xp-bar-container'),
        rank: document.getElementById('user-rank'),
        xp: document.getElementById('total-xp'),
        progress: document.getElementById('progress-fill')
    },
    folderInput: document.getElementById('folderInput'),
    modulesGrid: document.getElementById('modules-grid'),
    homeBtn: document.getElementById('home-btn')
};

// --- SECURITY AND HELPER FUNCTIONS ---
// Regex pattern per catturare variabili: supporta parole, spazi, apostrofi e trattini
// Limitato a 50 caratteri per prevenire problemi di performance e ReDoS
const VARIABLE_CAPTURE_PATTERN = '([\\w\\s\'-]{1,50})';
// Regex per trovare placeholder di variabili nel formato {variableName}
const VARIABLE_PLACEHOLDER_REGEX = /\{(\w+)\}/g;
// Carattere iniziale dei placeholder
const VARIABLE_PLACEHOLDER_START = '{';

/**
 * Escapes special regex characters in a string
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for use in RegExp
 */
function escapeRegexSpecialChars(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Substitutes story variables in a text string
 * @param {string} text - Text containing {variable} placeholders
 * @param {Object} variables - Object with variable names and values
 * @returns {string} - Text with variables substituted
 */
function substituteStoryVariables(text, variables) {
    let result = text;
    Object.keys(variables).forEach(key => {
        const placeholder = `{${key}}`;
        const escapedPlaceholder = escapeRegexSpecialChars(placeholder);
        result = result.replace(new RegExp(escapedPlaceholder, 'gi'), variables[key]);
    });
    return result;
}

/**
 * Builds a regex pattern for capturing variables in story mode
 * @param {string} targetString - The target answer string with {variable} placeholders
 * @returns {RegExp} - Compiled regex for matching user input
 */
function buildVariableCaptureRegex(targetString) {
    const regexString = "^" + escapeRegexSpecialChars(targetString)
        .replace(/\\\{(\w+)\\\}/g, VARIABLE_CAPTURE_PATTERN)
        + "$";
    return new RegExp(regexString, 'i');
}

/**
 * Checks if a text contains variable placeholders
 * @param {string} text - Text to check
 * @returns {boolean} - True if text contains {variable} placeholders
 */
function hasVariablePlaceholders(text) {
    return text.includes(VARIABLE_PLACEHOLDER_START);
}

/**
 * Escapes text for safe use in HTML/onclick attributes
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeForHtml(text) {
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Capitalizes user input with smart multi-word handling
 * @param {string} value - User input to capitalize
 * @returns {string} - Capitalized value
 */
function capitalizeUserInput(value) {
    const trimmed = value.trim();
    
    // Don't capitalize numbers
    if (/^\d+$/.test(trimmed)) {
        return trimmed;
    }
    
    // Capitalize each word, filter out empty strings from extra spaces
    return trimmed
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// --- 1. CARICAMENTO E PARSING ---

DOM.folderInput.addEventListener('change', async function(e) {
    const files = e.target.files;
    APP_STATE.library = {};

    for (let file of files) {
        if (file.name.endsWith('.csv')) {
            try {
                const text = await readFile(file);
                // Determina il tipo di modulo in base al nome o contenuto
                const moduleType = detectModuleType(file.name, text);
                const content = parseCSV(text, moduleType);
                
                if (content.length > 0) {
                    // Chiave univoca per il modulo
                    const moduleKey = file.name.replace('.csv', '');
                    APP_STATE.library[moduleKey] = {
                        type: moduleType, // 'QUIZ', 'STORY', 'NORMAL'
                        data: content,
                        name: moduleKey.replace(/_/g, ' ')
                    };
                }
            } catch (err) {
                console.error("Errore file:", file.name, err);
            }
        }
    }
    
    if (Object.keys(APP_STATE.library).length === 0) {
        alert('Nessun file CSV valido trovato nella cartella!');
        return;
    }
    
    showDashboard();
});

function readFile(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsText(file);
    });
}

function detectModuleType(filename, text) {
    if (filename.toUpperCase().startsWith('STORY_')) return 'STORY';
    if (filename.toUpperCase().startsWith('QUIZ_')) return 'QUIZ';
    // Controllo extra: se la prima riga ha 4 parti è un QUIZ sicuro
    const firstLine = text.split('\n')[0];
    if (firstLine && firstLine.split(';').length >= 4) return 'QUIZ';
    
    return 'NORMAL';
}

function parseCSV(text, type) {
    return text.split('\n').map(line => {
        const p = line.split(';');
        if (p.length < 2) return null;

        if (type === 'QUIZ' && p.length >= 4) {
            return {
                q: p[0].trim(),
                options: [p[1].trim(), p[2].trim(), p[3].trim()], // Tutte le opzioni
                a: p[3].trim(), // L'ultima è sempre quella giusta nel CSV
                type: 'QUIZ'
            };
        }
        
        // Formato Story o Normal
        return { 
            q: p[0].trim(), 
            a: p[1].trim(),
            type: type 
        };
    }).filter(item => item);
}

// --- 2. DASHBOARD E NAVIGAZIONE ---

function showDashboard() {
    switchPanel('dashboard');
    APP_STATE.currentMode = 'NORMAL';
    DOM.modulesGrid.innerHTML = '';

    // --- ORDINAMENTO ALFANUMERICO ---
    // Ordina le chiavi in modo alfanumerico (01, 02, 03, A1, B1...)
    const sortedKeys = Object.keys(APP_STATE.library).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedKeys.forEach(key => {
        const mod = APP_STATE.library[key];
        const wrapper = document.createElement('div');
        wrapper.style.display = "flex"; // Usa flex per mettere i bottoni vicini
        wrapper.style.gap = "10px";
        wrapper.style.marginBottom = "10px";

        // Bottone Principale (Modulo)
        const btnMain = document.createElement('button');
        btnMain.className = 'module-card';
        btnMain.style.flex = "1"; // Occupa tutto lo spazio disponibile
        
        // Icone e Nomi più puliti
        let icon = '🎮';
        if (mod.type === 'QUIZ') icon = '🧩';
        if (mod.type === 'STORY') icon = '📜';
        
        // Rimuovi underscore e prefissi numerici dal nome visualizzato per pulizia
        // Es: "05 Casa e Mobili" diventa "Casa e Mobili"
        const cleanName = mod.name.replace(/^\d+[\s_]/, '').replace(/_/g, ' ');

        btnMain.innerHTML = `<span>${icon} ${cleanName}</span> <span style="font-size:0.8em; opacity:0.6">${mod.data.length} parole</span>`;
        
        // Assegnazione Azione click
        if (mod.type === 'QUIZ') btnMain.onclick = () => initGame(key, 'QUIZ');
        else if (mod.type === 'STORY') btnMain.onclick = () => initGame(key, 'STORY');
        else btnMain.onclick = () => initGame(key, 'NORMAL');
        
        wrapper.appendChild(btnMain);

        // Aggiungi bottoni extra (Piccoli, a destra)
        if (mod.type === 'NORMAL') {
            const btnStudy = createSubButton('📖', () => initStudy(key));
            const btnDict = createSubButton('🎧', () => initGame(key, 'DICTATION'));
            
            // Stile specifico per i bottoni piccoli laterali
            [btnStudy, btnDict].forEach(btn => {
                btn.style.width = "50px"; // Quadrati
                btn.style.padding = "0";
                btn.style.justifyContent = "center";
                btn.style.borderLeft = "1px solid var(--sub-color)"; // Reset bordo
            });

            wrapper.appendChild(btnStudy);
            wrapper.appendChild(btnDict);
        }

        DOM.modulesGrid.appendChild(wrapper);
    });
}

function createSubButton(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'module-card';
    btn.style.borderLeft = "2px solid #555";
    btn.innerHTML = text;
    btn.onclick = onClick;
    return btn;
}

// --- 3. INIZIALIZZAZIONE GIOCO ---

function initGame(moduleKey, mode) {
    const module = APP_STATE.library[moduleKey];
    APP_STATE.currentList = module.data;
    APP_STATE.currentMode = mode;
    APP_STATE.sessionCorrect = 0;
    
    // Reset specifici per modalità
    if (mode === 'STORY') {
        APP_STATE.storyIndex = 0;
        APP_STATE.storyVars = {}; // Reset variabili
    }

    // Aggiorna UI
    switchPanel('game');
    DOM.nav.modeLabel.textContent = `${module.name} (${mode})`;
    DOM.nav.xpContainer.classList.remove('hidden');
    
    updateGameUI(mode);
    updateProgressBar();
    
    nextCard();
}

function updateGameUI(mode) {
    // Nascondi tutto preventivamente
    DOM.game.input.classList.add('hidden');
    DOM.game.checkBtn.classList.add('hidden');
    DOM.game.quizContainer.classList.add('hidden');
    DOM.game.speedControls.classList.add('hidden');
    if(DOM.game.virtualKeyboard) DOM.game.virtualKeyboard.classList.add('hidden');

    // Mostra solo ciò che serve
    if (mode === 'QUIZ') {
        DOM.game.quizContainer.classList.remove('hidden');
    } 
    else if (mode === 'NORMAL' || mode === 'STORY') {
        DOM.game.input.classList.remove('hidden');
        DOM.game.checkBtn.classList.remove('hidden');
        if(DOM.game.virtualKeyboard) DOM.game.virtualKeyboard.classList.remove('hidden');
        DOM.game.input.focus();
    }
    else if (mode === 'DICTATION') {
        DOM.game.input.classList.remove('hidden');
        DOM.game.checkBtn.classList.remove('hidden');
        DOM.game.speedControls.classList.remove('hidden');
        if(DOM.game.virtualKeyboard) DOM.game.virtualKeyboard.classList.remove('hidden');
        DOM.game.input.focus();
    }
}

// --- 4. LOGICA NEXT CARD ---

function nextCard() {
    DOM.game.feedback.innerHTML = '';
    DOM.game.input.value = '';
    
    // Reset hint
    APP_STATE.hintIndex = 0;
    DOM.game.input.placeholder = '';

    // A. SELEZIONE CARTA
    if (APP_STATE.currentMode === 'STORY') {
        // Sequenziale
        if (APP_STATE.storyIndex >= APP_STATE.currentList.length) {
            alert("✨ Storia completata! Ottimo lavoro.");
            showDashboard();
            return;
        }
        APP_STATE.currentCard = APP_STATE.currentList[APP_STATE.storyIndex];
        APP_STATE.storyIndex++;
    } else {
        // Casuale pesata (Logica Fisher-Yates + Stats)
        const shuffled = [...APP_STATE.currentList];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // Trova una carta con livello < 3
        APP_STATE.currentCard = shuffled.find(c => {
            const s = APP_STATE.stats[c.q];
            return !s || s.level < 3;
        }) || shuffled[0];
    }

    // B. RENDERING DOMANDA
    let qText = APP_STATE.currentCard.q;

    // Gestione Variabili Storia nel testo della domanda
    if (APP_STATE.currentMode === 'STORY') {
        qText = injectVariables(qText);
    }
    
    if (APP_STATE.currentMode === 'DICTATION') {
        DOM.game.question.textContent = "🎧 Ascolta e scrivi...";
        setTimeout(() => speak(APP_STATE.currentCard.a), 500);
    } else {
        DOM.game.question.textContent = qText;
    }

    // C. RENDERING INTERFACCIA SPECIFICA
    if (APP_STATE.currentMode === 'QUIZ') {
        renderQuizButtons();
    }
}

// Helper: Sostituisce {nome} con "Jabran"
function injectVariables(text) {
    let result = text;
    Object.keys(APP_STATE.storyVars).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'gi');
        result = result.replace(regex, APP_STATE.storyVars[key]);
    });
    return result;
}

// --- 5. LOGICA QUIZ ---

function renderQuizButtons() {
    DOM.game.quizContainer.innerHTML = '';
    const opts = [...APP_STATE.currentCard.options];
    
    // Mescola opzioni con Fisher-Yates shuffle
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.textContent = opt;
        btn.onclick = () => handleQuizAnswer(btn, opt);
        DOM.game.quizContainer.appendChild(btn);
    });
}

function handleQuizAnswer(btn, val) {
    const correct = APP_STATE.currentCard.a;
    const question = APP_STATE.currentCard.q;
    
    // Disabilita tutti i bottoni per evitare doppi click
    Array.from(DOM.game.quizContainer.children).forEach(b => b.disabled = true);

    // --- LOGICA TTS INTELLIGENTE ---
    // Se la domanda contiene i trattini "___", li sostituiamo con la risposta corretta
    // per leggere la frase completa. Altrimenti leggiamo solo la risposta.
    let textToSpeak = correct;
    if (/_+/.test(question)) {
        // Sostituisce i trattini (o underscore) con la parola corretta
        textToSpeak = question.replace(/_+/g, correct);
    }

    if (val === correct) {
        btn.classList.add('correct');
        feedbackSuccess(`Esatto! ${correct}`);
        speak(textToSpeak); // <--- PARLA ORA (Frase completa)
        handleSuccessLogic();
    } else {
        btn.classList.add('incorrect');
        // Evidenzia comunque la risposta giusta
        Array.from(DOM.game.quizContainer.children)
            .find(b => b.textContent === correct)
            ?.classList.add('correct');
        
        feedbackError(`Era: ${correct}`);
        speak(textToSpeak); // <--- PARLA ANCHE SE SBAGLI (Rinforzo positivo)
        handleErrorLogic();
    }
}

// --- 6. LOGICA INPUT (Normal, Story, Dictation) ---

// Event Listener per Invio
DOM.game.checkBtn.onclick = checkInputAnswer;
DOM.game.input.onkeypress = (e) => { if(e.key === 'Enter') checkInputAnswer(); };

function checkInputAnswer() {
    const userVal = DOM.game.input.value.trim();
    const correctVal = APP_STATE.currentCard.a;
    let isCorrect = false;

    // LOGICA SPECIALE PER STORY (Cattura variabili)
    if (APP_STATE.currentMode === 'STORY' && hasVariablePlaceholders(correctVal)) {
        // 1. Prepara la regex dalla risposta attesa
        // Es: "Ich heiße {nome}" -> regex: /^Ich heiße ([\\w\\s'-]{1,50})$/i
        let regexStr = "^" + correctVal
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape caratteri speciali
            .replace(/\\{(\w+)\\}/g, VARIABLE_CAPTURE_PATTERN) + "$";  // {var} -> pattern sicuro
        
        const regex = new RegExp(regexStr, 'i');
        const match = userVal.match(regex);

        if (match) {
            isCorrect = true;
            // Cattura variabili
            let varNames = [];
            let m;
            const varPattern = /{(\w+)}/g;
            while ((m = varPattern.exec(correctVal)) !== null) {
                varNames.push(m[1]);
            }
            
            // Salva le variabili catturate
            varNames.forEach((name, idx) => {
                let captured = match[idx + 1];
                // Capitalizza
                captured = capitalizeUserInput(captured);
                APP_STATE.storyVars[name] = captured;
            });
        }
    } else {
        // LOGICA NORMALE
        if (userVal.toLowerCase() === correctVal.toLowerCase()) {
            isCorrect = true;
        }
    }

    if (isCorrect) {
        feedbackSuccess(APP_STATE.currentMode === 'STORY' ? '✅ Continua così!' : '✅ Esatto!');
        speak(APP_STATE.currentCard.a.replace(/{(\w+)}/g, (match, varName) => APP_STATE.storyVars[varName] || "")); 
        handleSuccessLogic();
    } else {
        // Sostituisci variabili nel messaggio di errore per far capire cosa si aspettava
        const hint = injectVariables(correctVal);
        feedbackError(`No! Era: <b>${hint}</b>`);
        speak(hint);
        handleErrorLogic();
    }
}

// --- 7. LOGICA COMUNE SUCCESS/ERROR ---

function handleSuccessLogic() {
    const card = APP_STATE.currentCard;
    if (APP_STATE.currentMode !== 'STORY') {
        // Aggiorna stats solo se non è storia
        if (!APP_STATE.stats[card.q]) APP_STATE.stats[card.q] = { level: 0 };
        if (APP_STATE.stats[card.q].level < 5) APP_STATE.stats[card.q].level++;
    }
    
    // XP
    let xp = parseInt(localStorage.getItem('deutschXP') || '0') + 10;
    localStorage.setItem('deutschXP', xp);
    updateRank(xp);
    
    APP_STATE.sessionCorrect++;
    updateProgressBar();
    
    localStorage.setItem('deutschStats', JSON.stringify(APP_STATE.stats));
    setTimeout(nextCard, 1500); // Ritardo
}

function handleErrorLogic() {
    // Override manuale
    const btn = document.createElement('button');
    btn.className = 'override-btn';
    btn.textContent = 'Wait, I was right!';
    btn.onclick = () => {
        DOM.game.feedback.innerHTML = '✅ Corretto manualmente!';
        DOM.game.feedback.className = 'success';
        handleSuccessLogic(); // Chiama successo
    };
    DOM.game.feedback.appendChild(document.createElement('br'));
    DOM.game.feedback.appendChild(btn);

    // Penalità
    const card = APP_STATE.currentCard;
    if (APP_STATE.stats[card.q]) APP_STATE.stats[card.q].level = 0;
    
    setTimeout(() => {
        // Se l'utente non ha cliccato override, vai avanti
        if (DOM.game.feedback.classList.contains('error')) nextCard();
    }, 4000); // 4 secondi per leggere l'errore
}

// --- 8. UTILITIES UI ---

function switchPanel(panelName) {
    Object.values(DOM.panels).forEach(p => p.classList.add('hidden'));
    DOM.panels[panelName].classList.remove('hidden');
}

function feedbackSuccess(msg) {
    DOM.game.feedback.innerHTML = msg;
    DOM.game.feedback.className = 'success flash-correct';
}

function feedbackError(msg) {
    DOM.game.feedback.innerHTML = msg;
    DOM.game.feedback.className = 'error shake';
}

function updateProgressBar() {
    const pct = (APP_STATE.sessionCorrect / APP_STATE.sessionGoal) * 100;
    DOM.nav.progress.style.width = Math.min(pct, 100) + '%';
    DOM.nav.xp.textContent = localStorage.getItem('deutschXP') || 0;
}

function updateRank(xp) {
    DOM.nav.rank.textContent = Math.floor(xp / 100) + 1;
}

// Virtual Keyboard Helper
window.typeChar = function(char) {
    DOM.game.input.value += char;
    DOM.game.input.focus();
};

// --- 9. AUDIO ---
function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Pulisci il testo da parentesi o hint per la lettura
    // Es: "[Hans] Ciao" -> legge solo "Ciao" in tedesco? 
    // Meglio leggere tutto l'output tedesco pulito.
    const toRead = text.replace(/\[.*?\]/g, ''); // Rimuovi nomi attori se presenti nel testo (raro in colonna A)
    
    const msg = new SpeechSynthesisUtterance(toRead);
    msg.lang = 'de-DE';
    msg.rate = APP_STATE.speed;
    window.speechSynthesis.speak(msg);
}

// Setup Tasti Velocità
window.setSpeed = function(rate) {
    APP_STATE.speed = rate;
    document.querySelectorAll('.speed-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.rate) === rate);
    });
};

// Replay Audio
window.replayAudio = function() {
    if (APP_STATE.currentCard) speak(APP_STATE.currentCard.a);
    DOM.game.input.focus();
};

// --- STUDY MODE ---

function initStudy(moduleKey) {
    const module = APP_STATE.library[moduleKey];
    APP_STATE.currentList = module.data;
    APP_STATE.studyIndex = 0;
    APP_STATE.currentMode = 'STUDY';

    // Gestione UI
    switchPanel('study');
    
    loadStudyCard();
}

function loadStudyCard() {
    const card = APP_STATE.currentList[APP_STATE.studyIndex];
    const questionEl = document.getElementById('study-question');
    const answerEl = document.getElementById('study-answer');
    const answerBox = document.getElementById('study-answer-box');
    const inputEl = document.getElementById('study-input');

    // Reset grafica
    questionEl.textContent = card.q;
    answerEl.textContent = card.a;
    answerBox.classList.remove('reveal');
    answerBox.classList.add('hidden-content');
    
    // Reset Input
    inputEl.value = '';
    inputEl.classList.remove('correct');
    inputEl.classList.add('hidden');
}

function revealCard() {
    const answerBox = document.getElementById('study-answer-box');
    const inputEl = document.getElementById('study-input');
    
    // Se è già rivelato, rimetti il focus
    if (answerBox.classList.contains('reveal')) {
        inputEl.focus();
        return;
    }

    answerBox.classList.remove('hidden-content');
    answerBox.classList.add('reveal');
    
    // MOSTRA INPUT
    inputEl.classList.remove('hidden');
    inputEl.focus();
    
    // Parla in automatico
    speak(APP_STATE.currentList[APP_STATE.studyIndex].a);
}

function nextStudyCard() {
    if (APP_STATE.studyIndex < APP_STATE.currentList.length - 1) {
        APP_STATE.studyIndex++;
        loadStudyCard();
    } else {
        // Fine mazzo -> ricomincia o avvisa
        APP_STATE.studyIndex = 0; // Loop infinito
        loadStudyCard();
    }
}

function prevStudyCard() {
    if (APP_STATE.studyIndex > 0) {
        APP_STATE.studyIndex--;
        loadStudyCard();
    }
}

// Event Listener Globale per tastiera (gestisce sia Gioco che Studio)
document.addEventListener('keydown', (e) => {
    if (APP_STATE.currentMode !== 'STUDY') return; // Se stiamo giocando, ignora questi comandi

    if (e.code === 'Space') {
        e.preventDefault(); // Evita scroll pagina
        revealCard();
    } else if (e.code === 'ArrowRight') {
        nextStudyCard();
    } else if (e.code === 'ArrowLeft') {
        prevStudyCard();
    }
});

// Active Study Mode: Input Validation
document.getElementById('study-input').addEventListener('input', function(e) {
    const userVal = e.target.value.trim();
    const correctVal = APP_STATE.currentList[APP_STATE.studyIndex].a;

    // Controllo case-insensitive
    if (userVal.toLowerCase() === correctVal.toLowerCase()) {
        // EFFETTO SUCCESSO
        e.target.classList.add('correct');
        
        // Passa automaticamente alla prossima dopo 0.5 secondi
        setTimeout(() => {
            nextStudyCard();
        }, 500);
    } else {
        // Rimuovi la classe correct se presente
        e.target.classList.remove('correct');
    }
});

// Tasto Esci
document.getElementById('exit-study-btn').addEventListener('click', () => {
    APP_STATE.currentMode = 'NORMAL';
    showDashboard();
});

// --- GERMAN KEYBOARD FUNCTION ---
function insertChar(char) {
    // Input validation
    if (!char || typeof char !== 'string') return;
    
    const input = DOM.game.input;
    if (!input) return;
    
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    // Insert character at cursor position
    input.value = text.substring(0, start) + char + text.substring(end);
    
    // Move cursor after inserted character
    input.selectionStart = input.selectionEnd = start + char.length;
    
    // Keep focus on input
    input.focus();
}

// --- TAB KEY LISTENER FOR HINT ---
DOM.game.input.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault(); // Non cambiare focus
        showHint();
    }
});

function showHint() {
    const answer = APP_STATE.currentCard.a;
    // Mostra un pezzo in più della parola ogni volta
    APP_STATE.hintIndex++;
    
    // Esempio: "Katze" -> hint 1: "K....", hint 2: "Ka..."
    const revealed = answer.substring(0, APP_STATE.hintIndex);
    const hidden = answer.substring(APP_STATE.hintIndex).replace(/./g, '.'); // Sostituisce il resto con punti
    
    // Mettiamolo nel placeholder così l'utente ci scrive sopra
    DOM.game.input.placeholder = revealed + hidden;
    
    // Feedback visivo che stai barando
    DOM.game.feedback.textContent = "👀 Hint usato...";
    DOM.game.feedback.className = 'sub-label';
}

// Gestione tasti numerici per il QUIZ (1, 2, 3)
document.addEventListener('keydown', (e) => {
    // Funziona solo se siamo in modalità QUIZ e i bottoni sono visibili
    if (APP_STATE.currentMode === 'QUIZ' && !DOM.game.quizContainer.classList.contains('hidden')) {
        const buttons = DOM.game.quizContainer.querySelectorAll('button');
        
        // Verifica che sia un tasto numerico valido (1, 2, 3)
        if (!/^[1-3]$/.test(e.key)) return;
        
        // Mappa i tasti 1, 2, 3 agli indici dell'array 0, 1, 2
        const index = parseInt(e.key, 10) - 1;

        if (index >= 0 && index < buttons.length && !buttons[index].disabled) {
            // Simula il click sul bottone corrispondente
            buttons[index].click();
            
            // Aggiunge un piccolo feedback visivo di "pressione"
            buttons[index].classList.add('active-key');
            
            // Rimuove il feedback dopo un breve momento
            setTimeout(() => {
                buttons[index].classList.remove('active-key');
            }, 200);
        }
    }
});

// Init
DOM.homeBtn.onclick = showDashboard;
