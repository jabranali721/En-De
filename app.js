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
let isQuizMode = false;
let isStoryMode = false; // Flag per modalità storia
let storyIndex = 0; // Indice per avanzare sequenzialmente nelle storie
/**
 * Memoria per le variabili dinamiche catturate durante la modalità storia.
 * Struttura: { variableName: "capturedValue" }
 * Esempio: { nome: "Jabran", citta: "Milano", anni: "25" }
 */
let storyVariables = {};
let currentSpeed = 1.0; // Velocità di default

// Elementi DOM
const folderInput = document.getElementById('folderInput');
const dashboardPanel = document.getElementById('dashboard-panel');
const gamePanel = document.getElementById('game-panel');
const setupPanel = document.getElementById('setup-panel');
const modulesGrid = document.getElementById('modules-grid');
const homeBtn = document.getElementById('home-btn');

// --- CONSTANTS ---
// Regex pattern per catturare variabili: supporta parole, spazi, apostrofi e trattini
// Limitato a 50 caratteri per prevenire problemi di performance e ReDoS
const VARIABLE_CAPTURE_PATTERN = '([\\w\\s\'-]{1,50})';
// Regex per trovare placeholder di variabili nel formato {variableName}
const VARIABLE_PLACEHOLDER_REGEX = /\{(\w+)\}/g;
// Carattere iniziale dei placeholder
const VARIABLE_PLACEHOLDER_START = '{';

// --- HELPER FUNCTIONS ---
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
            if (parts.length >= 4) {
                // Quiz format: question; wrong1; wrong2; correct
                return { 
                    q: parts[0].trim(), 
                    a: parts[3].trim(),
                    wrong1: parts[1].trim(),
                    wrong2: parts[2].trim(),
                    isQuiz: true
                };
            } else if (parts.length >= 2) {
                // Normal format: question; answer
                return { 
                    q: parts[0].trim(), 
                    a: parts[1].trim(),
                    isQuiz: false
                };
            }
            return null;
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
    isQuizMode = false;
    isStoryMode = false;
    storyIndex = 0;
    
    // Nascondi XP bar e ripristina titolo
    document.getElementById('xp-bar-container').classList.add('hidden');
    document.getElementById('current-mode').textContent = 'Select Mode';
    document.getElementById('speed-controls').classList.add('hidden');

    modulesGrid.innerHTML = '';
    
    // Crea un bottone per ogni categoria trovata
    Object.keys(library).forEach(moduleName => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "10px";
        
        // Check if this module has quiz format
        const hasQuizFormat = library[moduleName].some(card => card.isQuiz);

        // Bottone Modulo (Avvia Gioco)
        const btnPlay = document.createElement('button');
        btnPlay.className = 'module-card';
        btnPlay.innerHTML = hasQuizFormat ? `🎯 QUIZ: ${moduleName.toUpperCase()}` : `🎮 PLAY: ${moduleName.toUpperCase()}`;
        btnPlay.onclick = () => hasQuizFormat ? startQuiz(moduleName) : startGame(moduleName);

        wrapper.appendChild(btnPlay);

        // Only add Study and Dictation buttons for non-quiz modules
        if (!hasQuizFormat) {
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

            wrapper.appendChild(btnStudy);
            wrapper.appendChild(btnDictation);
        }
        
        modulesGrid.appendChild(wrapper);
    });
}

// --- 3. GIOCO ---
function startGame(moduleName) {
    currentList = library[moduleName];
    isDictationMode = false;
    isStudyMode = false;
    isQuizMode = false;
    
    // Reset story session: pulisce variabili catturate e indice
    // Questo permette di ripartire da zero ogni volta che si avvia una storia
    storyVariables = {};
    storyIndex = 0;
    
    // Se il file inizia con STORY, attiviamo la modalità storia
    isStoryMode = moduleName.startsWith("STORY");
    
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

// --- QUIZ MODE ---
function startQuiz(moduleName) {
    currentList = library[moduleName];
    isDictationMode = false;
    isStudyMode = false;
    isQuizMode = true;
    dashboardPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    
    // Update title and show XP bar
    document.getElementById('current-mode').textContent = moduleName + " (Quiz)"; 
    document.getElementById('xp-bar-container').classList.remove('hidden');
    
    // Hide speed controls in quiz mode
    document.getElementById('speed-controls').classList.add('hidden');
    
    // Initialize session
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
    
    // Gestione modalità Storia: ordine sequenziale
    if (isStoryMode) {
        if (storyIndex >= currentList.length) {
            // Storia completata: mostra messaggio di successo e torna alla dashboard
            const feedback = document.getElementById('feedback');
            feedback.innerHTML = '🎉 Storia finita! Ottimo lavoro.';
            feedback.className = 'success';
            setTimeout(showDashboard, 2000);
            return;
        }
        currentCard = currentList[storyIndex];
        storyIndex++; // Prepara per la prossima
    } else {
        // Modalità normale: algoritmo Fisher-Yates shuffle per randomizzazione corretta
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
    }

    const questionText = document.getElementById('question-text');
    const quizButtons = document.getElementById('quiz-buttons');

    // SOSTITUZIONE VARIABILI NEL TESTO DELLA DOMANDA (per Story Mode)
    let displayQuestion = currentCard.q;
    if (isStoryMode) {
        displayQuestion = substituteStoryVariables(currentCard.q, storyVariables);
    }

    if (isQuizMode) {
        // --- QUIZ MODE ---
        questionText.textContent = displayQuestion; // Show question with blank
        questionText.style.color = "var(--text-color)";
        questionText.style.opacity = "1";
        
        // Hide input and german keyboard
        input.style.display = 'none';
        document.querySelector('.german-keyboard').style.display = 'none';
        
        // Show and populate quiz buttons
        quizButtons.classList.remove('hidden');
        displayQuizOptions();
        
    } else if (isDictationMode) {
        // --- MODALITÀ DETTATO ---
        questionText.textContent = "🎧 Ascolta..."; 
        questionText.style.color = "var(--sub-color)";
        questionText.style.opacity = "0.5";
        
        // Show input and german keyboard
        input.style.display = 'block';
        document.querySelector('.german-keyboard').style.display = 'flex';
        quizButtons.classList.add('hidden');
        
        // Parla automaticamente dopo un breve ritardo (per dare tempo di resettare)
        setTimeout(() => speak(currentCard.a), 500);
        
    } else {
        // --- MODALITÀ CLASSICA ---
        questionText.textContent = displayQuestion; // Mostra Italiano (con variabili sostituite)
        questionText.style.color = "var(--sub-color)";
        questionText.style.opacity = "1";
        
        // Show input and german keyboard
        input.style.display = 'block';
        document.querySelector('.german-keyboard').style.display = 'flex';
        quizButtons.classList.add('hidden');
        // In modalità classica NON parliamo all'inizio, solo alla fine
    }
    
    input.focus();
}

// Display shuffled quiz options
function displayQuizOptions() {
    const quizButtons = document.getElementById('quiz-buttons');
    quizButtons.innerHTML = ''; // Clear previous buttons
    
    // Create array of all options
    const options = [
        { text: currentCard.a, isCorrect: true },
        { text: currentCard.wrong1, isCorrect: false },
        { text: currentCard.wrong2, isCorrect: false }
    ];
    
    // Filter out duplicates - keep the correct answer if there's a duplicate
    const uniqueOptions = [];
    const seen = new Set();
    options.forEach(option => {
        if (!seen.has(option.text)) {
            seen.add(option.text);
            uniqueOptions.push(option);
        }
    });
    
    // Shuffle options using Fisher-Yates algorithm
    for (let i = uniqueOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueOptions[i], uniqueOptions[j]] = [uniqueOptions[j], uniqueOptions[i]];
    }
    
    // Create buttons for each option
    uniqueOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.textContent = option.text;
        btn.onclick = () => checkQuizAnswer(option.isCorrect, btn);
        quizButtons.appendChild(btn);
    });
}

// Check quiz answer when button is clicked
function checkQuizAnswer(isCorrect, button) {
    const feedback = document.getElementById('feedback');
    const allButtons = document.querySelectorAll('.quiz-option-btn');
    
    // Disable all buttons after selection
    allButtons.forEach(btn => {
        btn.style.pointerEvents = 'none';
        // Highlight correct answer
        if (btn.textContent === currentCard.a) {
            btn.classList.add('correct');
        }
    });
    
    // Update stats
    if (!userStats[currentCard.q]) userStats[currentCard.q] = { level: 0, tries: 0 };
    userStats[currentCard.q].tries++;
    
    if (isCorrect) {
        // Correct answer
        let msg = `✅ Esatto!`;
        const escapedAnswer = currentCard.a.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        msg += ` <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>`;
        feedback.innerHTML = msg;
        feedback.className = 'success';
        
        // Increase level (max 5)
        if(userStats[currentCard.q].level < 5) userStats[currentCard.q].level++;
        
        // XP System
        let currentXP = parseInt(localStorage.getItem('deutschXP') || '0');
        currentXP += 10; // 10 XP per question
        localStorage.setItem('deutschXP', currentXP);
        
        sessionCorrectCount++;
        updateProgressBar();
        updateRank(currentXP);
        
        // Speak the answer
        speak(currentCard.a);
        
        saveAndNext();
        
    } else {
        // Wrong answer
        button.classList.add('incorrect');
        
        let msg = `❌ No! Era: <b>${currentCard.a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</b>`;
        const escapedAnswer = currentCard.a.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        msg += ` <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>`;
        
        feedback.innerHTML = msg;
        feedback.className = 'error';
        
        // Speak the correct answer
        speak(currentCard.a);
        
        // Reset level
        userStats[currentCard.q].level = 0; 
        localStorage.setItem('deutschStats', JSON.stringify(userStats));
        
        // Go to next after delay
        setTimeout(nextCard, 3000);
    }
}

// --- 4. CONTROLLO ---
document.getElementById('check-btn').addEventListener('click', checkAnswer);
document.getElementById('answer-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') checkAnswer();
});

function checkAnswer() {
    const input = document.getElementById('answer-input');
    const feedback = document.getElementById('feedback');
    const userVal = input.value.trim(); // Manteniamo le maiuscole per i nomi propri in Story Mode!
    
    // Preparazione della risposta attesa
    let targetAnswer = currentCard.a;
    
    // Aggiorna tentativi
    if (!userStats[currentCard.q]) userStats[currentCard.q] = { level: 0, tries: 0 };
    userStats[currentCard.q].tries++;

    // Logica speciale per Story Mode con variabili
    if (isStoryMode && hasVariablePlaceholders(targetAnswer)) {
        // CREAZIONE REGEX DINAMICA per catturare variabili
        let varsToCapture = [];
        
        // Troviamo tutte le variabili da catturare in questa frase
        let match;
        const placeholderRegex = new RegExp(VARIABLE_PLACEHOLDER_REGEX);
        while ((match = placeholderRegex.exec(targetAnswer)) !== null) {
            varsToCapture.push(match[1]); // Salva il nome della variabile (es. "nome")
        }
        
        // Prima sostituiamo le variabili già note
        let regexTarget = targetAnswer;
        Object.keys(storyVariables).forEach(key => {
            if (!varsToCapture.includes(key)) {
                // Se questa variabile è già nota e NON stiamo cercando di catturarla ora
                const placeholder = `{${key}}`;
                const escapedPlaceholder = escapeRegexSpecialChars(placeholder);
                regexTarget = regexTarget.replace(new RegExp(escapedPlaceholder, 'gi'), storyVariables[key]);
            }
        });
        
        // Costruiamo una regex per catturare le variabili
        // Es: "Ich heiße {nome}" diventa "^Ich heiße ([\\w\\s'-]{1,50})$"
        const regex = buildVariableCaptureRegex(regexTarget);
        const userMatch = userVal.match(regex);

        if (userMatch) {
            // --- RISPOSTA CORRETTA CON VARIABILI ---
            
            // SALVATAGGIO VARIABILI
            if (varsToCapture.length > 0 && userMatch.length > 1) {
                varsToCapture.forEach((varName, index) => {
                    // userMatch[0] è tutta la frase, userMatch[1] è la prima cattura
                    const capturedValue = userMatch[index + 1];
                    storyVariables[varName] = capitalizeUserInput(capturedValue);
                });
            }

            // Feedback positivo
            let msg = `✅ Esatto!`;
            const escapedAnswer = escapeForHtml(userVal);
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
            
            // Parla quello che ha scritto l'utente (col suo nome!)
            speak(userVal);
            
            saveAndNext();

        } else {
            // --- RISPOSTA SBAGLIATA IN STORY MODE ---
            // Shake animation
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 300);
            
            // Se c'è una variabile, mostriamo all'utente cosa ci aspettavamo come struttura
            // Genera hint dinamico basato sui nomi delle variabili
            const hintMsg = targetAnswer.replace(VARIABLE_PLACEHOLDER_REGEX, (match, varName) => {
                const capitalizedVar = capitalizeUserInput(varName);
                return `[${capitalizedVar}]`;
            });
            
            // Per l'audio, sostituiamo le variabili conosciute così non parliamo i placeholder
            const answerForSpeech = substituteStoryVariables(targetAnswer, storyVariables);
            
            let msg = `❌ Riprova. Struttura attesa: <b>${hintMsg}</b>`;
            // Solo aggiungi il pulsante audio se non ci sono ancora placeholder non risolti
            if (!hasVariablePlaceholders(answerForSpeech)) {
                const escapedAnswer = escapeForHtml(answerForSpeech);
                msg += ` <button class="audio-btn" onclick="speak('${escapedAnswer}')">🔊</button>`;
            }
            msg += `
                <br>
                <button id="override-btn" class="override-btn">Wait, I was right (Typo)</button>`;
            
            feedback.innerHTML = msg;
            feedback.className = 'error';
            
            // Penalità temporanea
            const oldLevel = userStats[currentCard.q].level;
            userStats[currentCard.q].level = 0; 
            localStorage.setItem('deutschStats', JSON.stringify(userStats));

            // Gestione Click su "I was right"
            document.getElementById('override-btn').onclick = function() {
                userStats[currentCard.q].level = oldLevel < 5 ? oldLevel + 1 : 5;
                feedback.innerHTML = `✅ Corretto manualmente!`;
                feedback.className = 'success';
                saveAndNext();
            };

            window.tempTimeout = setTimeout(nextCard, 3000);
        }
        
    } else {
        // Modalità normale (non Story Mode)
        const userValLower = userVal.toLowerCase();
        const correctVal = targetAnswer.trim().toLowerCase();

        if (userValLower === correctVal) {
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
    
    // Move cursor after inserted character
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
