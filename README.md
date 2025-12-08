# 🇩🇪 Modular Deutsch - Apprendimento "Bite Size" per Italofoni

Un'app web completa per imparare il tedesco in modo modulare e strutturato, seguendo il Quadro Comune Europeo di Riferimento (CEFR, A1-C2). Progettata specificamente per studenti italofoni con focus su analisi contrastiva tedesco-italiano.

## 🎯 Caratteristiche Principali

✨ **Percorso Completo A1-C2**: Oltre 50 moduli organizzati per livello CEFR  
🎨 **Color Coding per Genere**: Sistema visivo 🔵 Der / 🔴 Die / 🟡 Das  
⚠️ **Alert Falsi Amici**: Avvisi per trappole linguistiche comuni italofoni  
🎧 **Audio Comparativo**: Pronuncia tedesca con velocità regolabile  
🎮 **Multiple Modalità**: Normale, Dettato, Quiz, Storia, Studio  
📊 **Gamification**: Sistema XP, livelli, ripetizione spaziata  
📚 **Teoria Integrata**: Spiegazioni grammaticali contestuali  

## 🗺️ Roadmap Curricolare

📖 **[Vedi Roadmap Completa](ROADMAP_TEDESCO_ITALIANI.md)** - Documento curricolare dettagliato

### Livelli Disponibili:
- 🟢 **A1**: 16 moduli - Fonetica, Pronomi, Verbi Base, Sintassi V2, Falsi Amici
- 🟢 **A2**: 7 moduli - Perfekt, Dativo, Verbi Modali, Preposizioni
- 🟡 **B1**: 6 moduli - Subordinate, Preposizioni Temporali, Declinazione Aggettivi
- 🟠 **B2**: 6 moduli - Passivo, Rektion Verbale, Konjunktiv II
- 🔴 **C1**: 5 moduli - Nominalstil, Funktionsverbgefüge, Konjunktiv I
- 🔴 **C2**: 5 moduli - Particelle Modali, Idiomi Avanzati

## Come Funziona

### 1. Prepara i Tuoi File CSV

Crea una cartella (es. `moduli_tedesco`) sul tuo computer e inserisci i tuoi file CSV. Ogni file diventerà un modulo separato nell'app.

**Formato CSV:**
```
Parola Italiana;Traduzione Tedesca
Cane;Der Hund
Gatto;Die Katze
```

**Esempio di struttura:**
```
moduli_tedesco/
├── supermercato_pane.csv
├── verbi_base.csv
└── frasi_emergenza.csv
```

### 2. Carica la Cartella

1. Apri `index.html` nel browser
2. Clicca su "Choose Files" 
3. Seleziona la cartella con i tuoi CSV
4. L'app caricherà automaticamente tutti i file .csv trovati

### 3. Scegli un Modulo

Vedrai una dashboard con tutti i moduli disponibili. Ogni bottone mostra:
- Nome del modulo (dal nome del file)
- Numero di parole contenute

### 4. Studia!

- L'app ti mostrerà parole in italiano da tradurre in tedesco
- Le statistiche sono condivise tra tutti i moduli
- Priorità alle parole con livello < 3
- Livello massimo: 5
- Usa il bottone "Home" per tornare alla dashboard

## Funzionalità

### 🎓 Apprendimento
✅ **Micro-Learning**: Sessioni brevi 5-10 minuti per concetto  
✅ **Analisi Contrastiva**: Focus su difficoltà specifiche per italofoni  
✅ **Ripetizione Spaziata**: Algoritmo intelligente (livello 0-5)  
✅ **Teoria Integrata**: Popup esplicativo prima di ogni modulo

### 🎨 Interfaccia
✅ **Color Coding Genere**: Articoli colorati automaticamente (Der=blu, Die=rosso, Das=giallo)  
✅ **Badge Livello**: Indicatori visivi A1-C2 per ogni modulo  
✅ **Dashboard Modulare**: Tutti i moduli organizzati per livello  
✅ **Feedback Immediato**: Correzione istantanea con note grammaticali

### 🎮 Modalità di Studio
✅ **Normale**: Traduci dall'italiano al tedesco  
✅ **Dettato** 🎧: Ascolta e scrivi  
✅ **Quiz** 🧩: Scelta multipla  
✅ **Storia** 📜: Dialoghi interattivi con variabili dinamiche  
✅ **Studio** 📖: Flashcard visuali con reveal

### 🔊 Audio
✅ **Sintesi Vocale**: Pronuncia tedesca automatica (TTS)  
✅ **Controllo Velocità**: Lento / Normale / Veloce  
✅ **Replay Illimitato**: Riascolta quando vuoi

### 📊 Progressione
✅ **Sistema XP**: Guadagna esperienza ad ogni risposta corretta  
✅ **Rank System**: Sali di livello (Rank = XP/100)  
✅ **Statistiche Globali**: Progresso condiviso tra tutti i moduli  
✅ **Persistenza**: Salvataggio automatico in localStorage

### ⚠️ Sicurezza Linguistica
✅ **Alert Falsi Amici**: Evidenziazione parole trappola  
✅ **Note Contestuali**: Spiegazioni grammaticali inline  
✅ **Hint Progressivi**: Suggerimenti se necessario

## Tecnologie

- HTML5 con attributo `webkitdirectory` per il caricamento cartelle
- CSS3 con Grid Layout
- JavaScript vanilla (ES6+)
- LocalStorage per la persistenza

## Browser Supportati

L'attributo `webkitdirectory` è supportato da:
- Chrome/Edge (versioni recenti)
- Safari (versioni recenti)
- Firefox (versioni recenti)

---

**Nota**: L'app funziona completamente offline una volta caricata. Nessun dato viene inviato a server esterni.