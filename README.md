# 🇩🇪 Modular Deutsch

Un'app per imparare il tedesco in modo modulare, caricando intere cartelle di file CSV.

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

✅ **Caricamento Cartella**: Carica tutti i CSV di una cartella in un colpo solo  
✅ **Dashboard Moduli**: Scegli cosa studiare oggi  
✅ **Statistiche Globali**: Le parole memorizzate in un modulo rimangono memorizzate negli altri  
✅ **Algoritmo Intelligente**: Priorità alle parole nuove o con livello basso  
✅ **Persistenza**: I progressi vengono salvati nel browser (localStorage)

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