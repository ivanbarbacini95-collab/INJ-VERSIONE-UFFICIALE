# INJ Node · Audit prestazioni conservativo — 16 novembre 2026

## Perimetro e baseline
- Repository: `INJ-VERSIONE-UFFICIALE`, base `main` commit `66729f4edb9cf8a542a41c4703b476d2ff94da3f`.
- Inventario Git: 490 file; ~10,7 MB di contenuto non compresso nel repository.
- 227 CSS (~4,66 MB), 119 JavaScript (~2,22 MB), 25 HTML (~0,94 MB).
- Home (`index.html`): 48 script esterni, 11 link CSS diretti.
- I due CSS più grandi (`style.css` ~1,32 MB e `inj-home-overrides-20261106.css` ~1,09 MB) valgono ~2,41 MB **non compressi**. Non eliminare regole CSS senza una verifica di equivalenza visuale su tutti i temi e schermi.
- La PWA precarica 38 risorse statiche; le API e i file `market-data/*.json` restano esplicitamente network-only.

## Interventi conservativi in questo ramo
1. **Service worker**: priorità di precache alle risorse Home, senza rimuovere nessuna delle 38 risorse offline. Evita `CacheStorage.put` ripetuto per una risorsa solo quando l'ETag coincide, oppure `Last-Modified` e `Content-Length` coincidono in assenza di ETag. Senza validatori, continua ad aggiornare la cache come prima. Bump del nome cache per attivare il nuovo worker.
2. **Cloud Sync**: l'intervallo di backup da 15 s esiste soltanto quando il backup automatico è stato abilitato e la pagina è visibile. Il timer viene sospeso su pausa, stop, conflitto, sessione scaduta e uscita. Nessun cambiamento al payload, alle credenziali, all'intervallo con backup attivo o alle funzioni di sincronizzazione.
3. **Temi**: rimosso un blocco interamente irraggiungibile dopo un `return` nel vecchio controllo del moto ambientale, già dismesso. Conservati sei temi, logica di persistenza e menu.

## Cosa **non** è stato rimosso
- Nessuna sezione, funzione utente, wallet, tema, grafico o asset PWA.
- Nessun file di stile storico: alcune regole possono essere tuttora necessarie per pagine embedded, PWA con icone alternative, smartphone e schermi portrait.
- Nessun endpoint live, sorgente ETF, reward, staking o Cloud Sync.

## Verifiche da svolgere prima del merge/deploy
- Test di sintassi JavaScript e verifiche automatiche del repository.
- Test Home fresca e Home con service worker aggiornato; normale ricarica e riapertura offline.
- Test Cloud Sync attivato, sospeso/background, disattivato, riapertura in foreground, sessione scaduta e conflitto.
- Confronto visuale tema-per-tema (Black, White, Obsidian Pulse, Arctic Glass, Deep Orbit, Carbon Gold) su iPhone, Android, iPad, PC landscape/portrait e monitor grande.
- Confronto LCP, INP, long tasks, trasferimento e CacheStorage I/O **prima/dopo** su dispositivi reali; nessuna percentuale di accelerazione è rivendicata senza queste misure.
- Controllo dati live ETF, INJ e grafici dopo cambio scheda, sleep/resume e perdita rete.

## Passi successivi potenzialmente ad alto impatto
- Analizzare i due fogli CSS principali (~2,41 MB non compressi) per duplicazioni *comprovate*, poi consolidare mantenendo l'ordine della cascata.
- Ridurre il JavaScript iniziale della Home (48 file) per i moduli davvero non necessari al first paint, senza spostare i moduli di tema/font/price dipendenti dall'ordine di esecuzione.
- Misurare e accorpare osservatori/RAF/timer solo quando producono aggiornamenti ridondanti dimostrabili.
- Introdurre un budget di regressione performance con test su hardware reale e rollout graduale.

> Nota: questo documento è un audit statico e una prima ottimizzazione a basso rischio, **non** una certificazione di performance in browser. La `main` ufficiale resta immutata finché il ramo non viene verificato e integrato.

## Esito prima esecuzione CI (PR #2)
- **OK:** sintassi dei 3 file JS modificati, 3 test mirati su cache e Cloud Sync.
- **Problemi già presenti:** i 4 test file Workspace hanno prodotto 30 successi e 6 errori, pur non essendo stati modificati da questa PR. Cinque errori partono dal mock DOM senza `document.addEventListener`; un test APR si aspetta un reward giornaliero senza il nuovo timestamp `aprUpdated` richiesto dal modello per i dati freschi. Non cambiare il codice di produzione per far passare test obsoleti.
- I test Workspace vengono eseguiti e segnalati come **baseline non bloccante**, in attesa di una revisione separata della suite. Questo non equivale a un test funzionale passato delle pagine Workspace.

## Inventario statico multi-pagina (esecuzione CI su PR #2)
- Home: **48 JS e 11 CSS collegati**, totale **3.366.629 byte raw** di risorse linkate. Non è il volume realmente scaricato: esclude compressione, cache HTTP e richieste differite.
- Pagine installazione icona alternativa: **35 JS + 102 CSS** per pagina; circa **2.890.769 byte raw** linkati per ciascuna. Potenziale target per consolidamento della cascata, ma non intervenire senza snapshot visuali per tutte le icone.
- Market: 30 JS + 58 CSS (~1.012.239 byte); Treasury: 23 JS + 42 CSS (~877.205 byte); Workspace: 20 JS + 37 CSS (~701.182 byte).
- **Nessuna risorsa CSS/JS dichiarata nelle pagine HTML risulta mancante** nella scansione statica.
- La ricerca SHA-256 non ha trovato file CSS, JS, HTML, PNG o SVG perfettamente identici. Non esistono duplicati binari banali da cancellare.
- Rilevate **22 risorse CSS/JS senza riferimenti letterali al basename** nei file runtime. Sono soltanto *candidati* all'analisi, non prova di inutilizzo: possono essere richiamati con URL costruiti a runtime, da pagine esterne o da altri processi. Non sono stati eliminati per proteggere il comportamento esistente.
- Ricerca su file sorgenti: 95 occorrenze di `setInterval`, 126 di `requestAnimationFrame` e 75 di `new MutationObserver/ResizeObserver/IntersectionObserver`. Sono occorrenze statiche, **non** 296 processi contemporaneamente attivi. Il primo target misurato è sospendere gli intervalli disabilitati, già fatto per Cloud Sync.
- Inventario replicabile da `node scripts/performance-inventory.cjs` nella PR; nessuna rimozione automatica è prevista.

## CI della patch
- Workflow `INJ Node lean-runtime checks`: esito **success**.
- Sintassi modifiche: validata.
- Test mirati PWA e Cloud Sync: **3/3 passati**.
- Workspace storico: 30/36 test passati, **6 errori preesistenti** nei file Workspace non modificati. Il job li mantiene visibili come baseline non bloccante; devono essere sistemati in una modifica separata, senza cambiare i dati di produzione per far passare aspettative obsolete.
- **Non** eseguiti in questa sessione: benchmarking di WebKit iOS, DevTools su device fisici, confronto screenshot su tutte le 25 pagine, test installazione offline su tutti i dispositivi. Pertanto non si afferma un aumento percentuale di velocità.

## Stato del rilascio
La PR #2 è intenzionalmente **in bozza**: l'ufficiale `main` resta identico. Pubblicazione e merge solo dopo verifica effettiva della PWA sui browser e dispositivi usati.
