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
