// v15.99.70 — delayed/fail-safe IT/EN interface translation layer.
(() => {
  'use strict';

  const STORAGE_KEY = 'inj_node_language_v1';
  const VALID = new Set(['it', 'en']);
  const readStoredLanguage = () => { try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; } };
  const writeStoredLanguage = (value) => { try { localStorage.setItem(STORAGE_KEY, value); } catch (_) {} };
  const storedLanguage = readStoredLanguage();
  let lang = VALID.has(storedLanguage) ? storedLanguage : 'it';
  let applying = false;

  // Pairs are intentionally UI-oriented: crypto/product names remain unchanged where they are clearer as product terms.
  const pairs = [
    // Home launcher microdescriptions: a quick, readable purpose for every destination.
    ["Patrimonio e staking", "Wallet wealth & staking"],
    ["Dati live del wallet", "Live wallet data"],
    ["Grafici dei prezzi", "Live price charts"],
    ["Ordini buy e sell", "Buy and sell orders"],
    ["Storico dei rendimenti", "Performance history"],
    ["Converti INJ e valute", "Convert INJ & currencies"],
    ["Analisi e strumenti", "Analysis & tools"],
    ["Crypto e mercati", "Crypto markets"],
    ["Reward staking live", "Live staking rewards"],
    ["Confronta market cap", "Compare market caps"],
    ["Simula il patrimonio", "Simulate portfolio value"],
    ["Obiettivi dei reward", "Reward milestones"],
    ["Monitoraggio ETF INJC", "INJC ETF tracker"],
    ["Crea la tua schermata", "Build your workspace"],
    ["Totale dei tuoi wallet", "All-wallet overview"],
    ["Pannello di controllo", "Dashboard"],
    ["Vista in tempo reale", "Live View"],
    ["Grafici in tempo reale", "Live Charts"],
    ["Libro ordini", "Order Book"],
    ["Cronologia rendimenti", "Performance Timeline"],
    ["Convertitore INJ", "INJ Converter"],
    ["Centro di controllo", "Command Center"],
    ["Tesoreria INJ", "INJ Treasury"],
    ["Valore Potenziale", "Potential Value"],
    ["Apri Valore Potenziale", "Open Potential Value"],
    ["Apri Market Cap Comparison", "Open Market Cap Comparison"],
    ["Ricompense in tempo reale", "Live Rewards"],
    ["Apri Reward Ladder", "Open Reward Ladder"],

    ['Privacy statistiche','Analytics privacy'], ['Gestisci consenso analisi','Manage analytics consent'], ['Gestisci consenso statistiche','Manage analytics consent'],
    ['Privacy statistiche · Modifica consenso','Analytics privacy · Change consent'],
    ['Cloud Sync','Cloud Sync'],
    ['Apri Mercato','Open Market'], ['Apri menu','Open menu'], ['Chiudi menu','Close menu'], ['Chiudi sezione e torna alla Home','Close section and return Home'], ['Lingua', 'Language'], ['Italiano', 'Italian'], ['Inglese', 'English'], ['Interfaccia', 'Interface'],
    ['PRIMO ACCESSO', 'FIRST ACCESS'], ['Collega il tuo wallet', 'Connect your wallet'],
    ['Incolla il tuo indirizzo pubblico Injective per iniziare. Non servono seed phrase, chiavi private o connessioni al wallet.', 'Paste your public Injective address to get started. No seed phrase, private keys or wallet connections are required.'],
    ['NOME WALLET', 'WALLET NAME'], ['INDIRIZZO INJECTIVE', 'INJECTIVE ADDRESS'], ['Continua', 'Continue'],
    ['Preparazione della Home', 'Preparing your Home'],
    ['Verifica dell’indirizzo sulla rete Injective…', 'Checking your address on Injective…'],
    ['Wallet verificato. Caricamento della Home…', 'Wallet verified. Opening your Home…'],
    ['Wallet verificato.', 'Wallet verified.'],
    ['Verifica…', 'Checking…'],
    ['Inserisci un indirizzo Injective valido che inizi con inj1.', 'Enter a valid Injective address starting with inj1.'],
    ['Impossibile verificare il wallet. Controlla l’indirizzo o la connessione e riprova.', 'Unable to verify the wallet. Check the address or connection and try again.'],
    ['Puoi scegliere un nome riconoscibile. L’indirizzo resta salvato solo su questo dispositivo.', 'You can choose a recognizable name. The address stays on this device only.'],
    ['L’indirizzo rimane salvato solo su questo dispositivo.', 'The address is stored only on this device.'],
    ['WALLET ATTIVO', 'ACTIVE WALLET'], ['Nessun wallet attivo', 'No active wallet'], ['Dati live', 'Live data'],
    ['Azioni rapide', 'Quick actions'], ['Wallet e strumenti', 'Wallet and tools'], ['Gestisci account', 'Manage accounts'],
    ['Aggiorna', 'Refresh'], ['Sincronizza dati', 'Sync data'], ['Dati personali', 'Personal data'],
    ['Prezzo medio INJ', 'Average INJ price'], ['Usato per calcolare il PnL', 'Used to calculate PnL'],
    ['Preferenze', 'Preferences'], ['Avanzate', 'Advanced'], ['Valuta, privacy, tema e lingua', 'Currency, privacy, theme and language'], ['Storico, rete e installazione', 'History, network and installation'], ['Personalizza INJ Node', 'Customize INJ Node'], ['Valuta', 'Currency'],
    ['Nascondi valori', 'Hide values'], ['Mostra valori', 'Show values'], ['Tema', 'Theme'], ['Scegli tema', 'Choose theme'],
    ['Nero', 'Black'], ['Chiaro', 'Light'], ['Ocean Aurora · fluido','Ocean Aurora · fluid'], ['12 temi disponibili','12 themes available'], ['Chromatic Mist · multicolore','Chromatic Mist · multicolor'], ['Velvet Nebula · profondo','Velvet Nebula · deep'], ['Aqua Mirage · cristallino','Aqua Mirage · crystalline'], ['Essenziali','Essentials'], ['Reset grafici Treasury', 'Reset Treasury charts'],
    ['Ricomincia lo storico da adesso', 'Restart history from now'], ['Stato rete & API', 'Network & API status'],
    ['Verifica servizi live', 'Check live services'], ['Installa INJ Node', 'Install INJ Node'],
    ['Aggiungi l’app al dispositivo', 'Add the app to this device'], ['Dati', 'Data'], ['In attesa…', 'Waiting…'],
    ['Il tuo spazio Injective', 'Your Injective space'],
    ['Il tuo spazio Injective.', 'Your Injective space.'],
    ['Scegli il wallet, controlla i dati essenziali e apri la vista che ti serve.', 'Choose a wallet, check the essential data and open the view you need.'],
    ['ACCOUNT SELEZIONATO', 'SELECTED ACCOUNT'], ['Seleziona un wallet', 'Select a wallet'], ['VALORE ACCOUNT', 'ACCOUNT VALUE'],
    ['AGGIORNATO', 'UPDATED'], ['INJ / USDT · OGGI', 'INJ / USDT · TODAY'], ['Dalle 00:00 · wallet selezionato', 'From 00:00 · selected wallet'],
    ['DISPONIBILE', 'AVAILABLE'], ['INJ liquidi', 'Liquid INJ'], ['REWARD / GIORNO', 'REWARD / DAY'], ['APR NETTO', 'NET APR'],
    ['Wallet selezionato', 'Selected wallet'], ['Portfolio · staking · analytics', 'Portfolio · staking · analytics'],
    ['ESPLORA', 'EXPLORE'], ['Apri una categoria per vedere gli strumenti', 'Open a category to see the tools'],
    ['Monitoraggio', 'Monitoring'], ['Pulse · reward · performance', 'Pulse · rewards · performance'],
    ['Grafici · order book', 'Charts · order book'], ['Patrimonio · control center', 'Portfolio · control center'],
    ['Strumenti', 'Tools'], ['Conversione · utility', 'Conversion · utilities'],
    ['Prezzo · patrimonio · reward live', 'Price · portfolio · live rewards'], ['P/L giornaliero · storico · autoscale', 'Daily P/L · history · autoscale'],
    ['Capitale in movimento · staking · reward · claim', 'Capital in motion · staking · rewards · claims'],
    ['Flusso realtime dei wallet Injective', 'Realtime flow of Injective wallets'], ['Torna alla Home', 'Back to Home'],
    ['In attesa di claim · monitoraggio attivo', 'Waiting for claim · monitoring active'], ['Claim rilevato', 'Claim detected'],
    ['APR ponderato', 'Weighted APR'], ['del totale', 'of total'], ['Nessun wallet salvato', 'No saved wallets'],
    ['Aggiungi un wallet dalla Home di INJ Node.', 'Add a wallet from the INJ Node Home.'], ['Sincronizzazione…', 'Syncing…'],
    ['EUR · USD · INJ · conversione live', 'EUR · USD · INJ · live conversion'],
    ['Patrimonio · staking · reward · crescita live', 'Portfolio · staking · rewards · live growth'],
    ['Wallet e preferenze restano solo su questo dispositivo.', 'Wallets and preferences stay only on this device.'],
    ['P/L giornaliero · sessione 00:00 → 00:00', 'Daily P/L · session 00:00 → 00:00'],
    ['Candele giornaliere · EMA 7 / EMA 21', 'Daily candles · EMA 7 / EMA 21'], ['OGGI', 'TODAY'],
    ['Chiude alle 00:00', 'Closes at 00:00'], ['PERIODO · 14G', 'PERIOD · 14D'], ['In attesa dello storico', 'Waiting for history'],
    ['GIORNO MIGLIORE · 14G', 'BEST DAY · 14D'], ['Tocca una candela per vedere i dettagli.', 'Tap a candle to see details.'],
    ['SCORRI ← STORICO · OGGI →', 'SCROLL ← HISTORY · TODAY →'], ['conversione live', 'live conversion'],
    ['CONVERSIONE LIVE', 'LIVE CONVERSION'], ['Scrivi in uno dei tre campi: gli altri si aggiornano automaticamente', 'Type in any of the three fields: the others update automatically'],
    ['WALLET SELEZIONATO', 'SELECTED WALLET'], ['QUANTITÀ', 'QUANTITY'],
    ['CONTROVALORE USD', 'USD PORTFOLIO VALUE'], ['Usa il totale', 'Use full balance'],
    ['In attesa dei dati wallet', 'Waiting for wallet data'], ['Wallet selezionato', 'Selected wallet'],
    ['EURO', 'EURO'], ['DOLLARI', 'DOLLARS'], ['Inserisci un importo in € / $ / INJ', 'Enter an amount in € / $ / INJ'],
    ['Connessione…', 'Connecting…'], ['Account', 'Accounts'], ['0 salvati', '0 saved'], ['Un solo pannello per tutti i wallet', 'One panel for all wallets'],
    ['Totale multi-wallet', 'Multi-wallet total'], ['Sincronizzazione…', 'Syncing…'], ['Patrimonio', 'Portfolio value'], ['Totale', 'Total'],
    ['Reward disponibili', 'Available rewards'], ['Min 24h', '24h low'], ['Max 24h', '24h high'], ['Timeframe prezzo', 'Price timeframe'],
    ['Min · Apertura · Max', 'Low · Open · High'], ['Min', 'Low'], ['Apertura', 'Open'], ['Max', 'High'],
    ['Patrimonio account', 'Account portfolio'], ['Wallet non caricato', 'Wallet not loaded'], ['Variazione 24h', '24h change'], ['PnL totale', 'Total PnL'],
    ['Liquido', 'Liquid'], ['Totale posseduto', 'Total holdings'], ['In staking', 'Staked'], ['Reward maturate', 'Accrued rewards'],
    ['APR netto personale', 'Personal net APR'], ['Reward tracker', 'Reward tracker'], ['Velocità di produzione', 'Production rate'],
    ['1 ora', '1 hour'], ['1 giorno', '1 day'], ['1 settimana', '1 week'], ['30 giorni', '30 days'], ['1 anno', '1 year'],
    ['Prossimo livello', 'Next level'], ['Accumulo reward · wallet attivo', 'Reward accrual · active wallet'], ['Reward ora', 'Reward now'],
    ['Mancano', 'Remaining'], ['Avanzamento', 'Progress'],
    ['La stima usa solo gli INJ effettivamente delegati dall’indirizzo, con commissioni e stato di ciascun validator.', 'The estimate uses only the INJ actually delegated by the address, including each validator’s commission and status.'],
    ['Target tracker', 'Target tracker'], ['Prossimo obiettivo INJ', 'Next INJ target'], ['Mancano al target', 'Remaining to target'], ['Completato', 'Completed'],
    ['Stima raggiungimento', 'Estimated completion'],
    ['La linea segue il wallet selezionato in tempo reale: tra un aggiornamento blockchain e l’altro avanza con la produzione staking stimata e si riallinea automaticamente ai dati reali.', 'The line follows the selected wallet in real time: between blockchain updates it advances using estimated staking production and automatically realigns with actual data.'],
    ['Delegazioni attive', 'Active delegations'], ['Carica un wallet per vedere dove sono delegati gli INJ.', 'Load a wallet to see where the INJ are delegated.'],
    ['Rete Injective', 'Injective network'], ['Wallet salvati', 'Saved wallets'], ['Gestisci indirizzi', 'Manage addresses'],
    ['Assegna un nome, apri o rimuovi gli indirizzi salvati su questo dispositivo.', 'Name, open or remove addresses saved on this device.'],
    ['STATO GENERALE', 'OVERALL STATUS'], ['Verifica in corso…', 'Checking…'], ['Controllo dei servizi utilizzati da INJ Node.', 'Checking the services used by INJ Node.'],
    ['CONNESSIONE', 'CONNECTION'], ['Dispositivo', 'Device'], ['MERCATO LIVE', 'LIVE MARKET'], ['Wallet e staking', 'Wallet and staking'], ['Ultimo controllo', 'Last check'],
    ['Andamento live giornaliero', 'Daily live trend'], ['Mini grafico prezzo', 'Mini price chart'], ['Mini grafico profit e loss', 'Mini profit/loss chart'],
    ['Mini grafico reward', 'Mini reward chart'], ['vs apertura giornata', 'vs day open'], ['reward maturate', 'accrued rewards'],
    ['estremi + andamento giornaliero', 'extremes + daily trend'], ['nuovo ciclo dopo il claim', 'new cycle after claim'],
    ['Mercato', 'Market'], ['Prezzo e performance periodo', 'Period price and performance'], ['Chiudi grafico', 'Close chart'], ['Riepilogo periodo', 'Period summary'],
    ['ORA', 'NOW'], ['Andamento live INJ/USDT', 'Live INJ/USDT trend'], ['Grafico performance INJ/USDT', 'INJ/USDT performance chart'],
    ['Caricamento dati…', 'Loading data…'], ['Timeframe grafico', 'Chart timeframe'], ['Apri menu', 'Open menu'], ['Chiudi menu', 'Close menu'],

    ['TOTAL MANAGED', 'TOTAL MANAGED'], ['TOTALE GESTITO', 'TOTAL MANAGED'], ['P/L 24H', '24H P/L'], ['SYNC', 'SYNC'], ['ALLOCATION', 'ALLOCATION'],
    ['Composizione Treasury', 'Treasury allocation'], ['REWARD DISPONIBILI', 'AVAILABLE REWARDS'], ['INJ DISPONIBILI', 'AVAILABLE INJ'], ['IN STAKING', 'STAKED'],
    ['STAKING RATIO', 'STAKING RATIO'], ['quota del totale', 'share of total'], ['REWARD VELOCITY', 'REWARD RATE'], ['Produzione stimata', 'Estimated production'],
    ['1 ORA', '1 HOUR'], ['1 GIORNO', '1 DAY'], ['1 MESE', '1 MONTH'], ['1 ANNO', '1 YEAR'], ['NEXT MILESTONE', 'NEXT MILESTONE'],
    ['TOTAL INJ GROWTH', 'TOTAL INJ GROWTH'], ['Crescita Treasury', 'Treasury growth'], ['TOTALE ATTUALE', 'CURRENT TOTAL'], ['DAL PRIMO DATO', 'SINCE FIRST DATA'],
    ['STORICO', 'HISTORY'], ['Prima lettura', 'First reading'], ['Ora', 'Now'], ['TOTAL NET WORTH GROWTH', 'TOTAL NET WORTH GROWTH'],
    ['Andamento patrimonio', 'Portfolio trend'], ['VALORE ATTUALE', 'CURRENT VALUE'], ['TREASURY PERFORMANCE', 'TREASURY PERFORMANCE'], ['Performance storica', 'Historical performance'],
    ['STORICO LIVE', 'LIVE HISTORY'], ['BEST DAY', 'BEST DAY'], ['WORST DAY', 'WORST DAY'], ['ATH TREASURY', 'TREASURY ATH'], ['GROWTH', 'GROWTH'],

    ['COMMAND CENTRE · LIVE', 'COMMAND CENTER · LIVE'], ['ATTESA', 'WAITING'], ['Situazione live · lettura immediata', 'Live status · instant read'],
    ['P/L totale', 'Total P/L'], ['Reward / giorno', 'Reward / day'], ['Trend timeframe', 'Timeframe trend'], ['positivi / disponibili', 'positive / available'],
    ['Grafico principale con tre conferme.', 'Main chart with three confirmations.'], ['Grafico principale', 'Main chart'], ['1 MIN', '1 MIN'], ['5 MIN', '5 MIN'], ['10 MIN', '10 MIN'],
    ['1 SETTIMANA', '1 WEEK'], ['Livelli', 'Levels'], ['Osservazione', 'Observation'], ['OPERATIVO', 'OPERATIONS'], ['Wallet · Rendita · Rischio', 'Wallet · Yield · Risk'],
    ['Posizione', 'Position'], ['Dove sono gli INJ', 'Where the INJ are'], ['Quota in staking', 'Staking share'], ['Movimento', 'Movement'], ['Prezzo vs riferimenti', 'Price vs references'],
    ['Variazione 24h*', '24h change*'], ['Prezzo medio', 'Average price'], ['*Stima sul valore attuale del wallet, esclusi i flussi.', '*Estimate based on current wallet value, excluding flows.'],
    ['Rendita', 'Yield'], ['validatori', 'validators'], ['Range & avvisi', 'Range & alerts'], ['Eventi', 'Events'], ['Livelli personali · non impostati', 'Personal levels · not set'],
    ['In attesa del flusso di mercato', 'Waiting for market feed'], ['MERCATO · ATTESA', 'MARKET · WAITING'], ['Ultimo prezzo', 'Last price'], ['WALLET · CACHE', 'WALLET · CACHE'],
    ['Ultima sync', 'Last sync'], ['API · ATTESA', 'API · WAITING'], ['Livelli personali', 'Personal levels'],
    ['Prezzi INJ / USDT. Le soglie vengono salvate per questo wallet; lascia vuoto per rimuoverle.', 'INJ / USDT prices. Thresholds are saved for this wallet; leave blank to remove them.'],
    ['Livello 1', 'Level 1'], ['Livello 2', 'Level 2'], ['Es. 7.50', 'E.g. 7.50'], ['Es. 10.00', 'E.g. 10.00'],
    ['Il prezzo medio appare sul grafico quando rientra nella scala visibile. Gli avvisi funzionano mentre il Command Centre è aperto.', 'The average price appears on the chart when it falls within the visible scale. Alerts work while Command Center is open.'],
    ['Salva livelli', 'Save levels'], ['Eventi della sessione', 'Session events'], ['Nessun evento', 'No events'],

    ['CONNECTING', 'CONNECTING'], ['IND', 'IND'], ['FOCUS', 'FOCUS'], ['MESE', 'MONTH'], ['MORE', 'MORE'], ['OPEN', 'OPEN'], ['HIGH', 'HIGH'], ['LOW', 'LOW'],
    ['CHANGE', 'CHANGE'], ['LAST TICK', 'LAST TICK'], ['CANDLE LIVE · trascina sul grafico per leggere prezzo e ora', 'LIVE CANDLE · drag on the chart to read price and time'],
    ['ORDER BOOK', 'ORDER BOOK'], ['BINANCE · REALTIME', 'BINANCE · REALTIME'], ['STEP', 'STEP'], ['TOTAL $', 'TOTAL $'], ['PRICE', 'PRICE'], ['SIZE INJ', 'SIZE INJ'],
    ['LAST TRADE', 'LAST TRADE'], ['DEPTH LIVE', 'DEPTH LIVE'], ['Scroll indipendente ASK / BID · il totale è il controvalore cumulativo reale', 'Independent ASK / BID scrolling · total is the actual cumulative notional value'],
    ['Ordini di vendita', 'Sell orders'], ['Ordini di acquisto', 'Buy orders'], ['Direzione ultimo trade', 'Last trade direction'],

    // English labels -> Italian labels for the Italian mode.
    ['TOTALE GESTITO', 'TOTAL MANAGED'], ['ASSEGNAZIONE', 'ALLOCATION'], ['VELOCITÀ REWARD', 'REWARD RATE'], ['PROSSIMA SOGLIA', 'NEXT MILESTONE'],
    ['CRESCITA TOTALE INJ', 'TOTAL INJ GROWTH'], ['CRESCITA PATRIMONIO TOTALE', 'TOTAL NET WORTH GROWTH'], ['PERFORMANCE TREASURY', 'TREASURY PERFORMANCE'],
    ['GIORNO MIGLIORE', 'BEST DAY'], ['GIORNO PEGGIORE', 'WORST DAY'], ['CRESCITA', 'GROWTH'], ['APERTURA', 'OPEN'], ['MASSIMO', 'HIGH'], ['MINIMO', 'LOW'],
    ['VARIAZIONE', 'CHANGE'], ['ULTIMO TICK', 'LAST TICK'], ['ULTIMO SCAMBIO', 'LAST TRADE'], ['PROFONDITÀ LIVE', 'DEPTH LIVE'], ['QUANTITÀ INJ', 'SIZE INJ'], ['PREZZO', 'PRICE']
  ];

  // Cross-section terminology and descriptions, shared by all entry points.
  pairs.push(
    ["Eventi di mercato","Market Events"],
    ["Il riepilogo quando ti svegli","Your morning summary"],
    ["Suono apertura","Opening sound"],
    ["Breve tono entrando nelle sezioni","Short tone when opening sections"],
    ["Volume apertura","Opening volume"],
    ["Regola il tono · rilascia per provarlo","Adjust the tone · release to preview"],
    ["Vibrazione breve","Brief vibration"],
    ["Quando disponibile sul dispositivo","When supported by the device"],
    ["Icona app","App icon"],
    ["Minimal · scegli logo","Minimal · choose icon"],
    ["L'icona già installata non cambia da sola. Apri INJ Node in Safari con il nuovo logo, quindi usa Condividi → Aggiungi alla schermata Home.","The installed icon does not change automatically. Open INJ Node in Safari with the new icon, then choose Share → Add to Home Screen."],
    ["Apri INJ Node nel browser","Open INJ Node in browser"],
    ["Copia link per Safari","Copy Safari link"],
    ["Hai già un backup?","Already have a backup?"],
    ["Ripristina con Cloud Sync","Restore with Cloud Sync"],
    ["Account · backup e ripristino","Account · backup and restore"],
    ["Statistiche · accesso riservato","Analytics · restricted access"],
    ["Stato rete   API","Network & API status"],
    ["Il centro di analisi di Injective","Injective market intelligence center"],
    ["In attesa dei dati","Waiting for data"],
    ["PREZZO INJ","INJ PRICE"],
    ["Indicatori essenziali","Key indicators"],
    ["Range prezzo 24H","24H price range"],
    ["Distanza dall'ATH","Distance from ATH"],
    ["DEL MASSIMO","BELOW ATH"],
    ["Risalita dall'ATL","Recovery from ATL"],
    ["RANGE STORICO","HISTORICAL RANGE"],
    ["MINIMO STORICO","ALL-TIME LOW"],
    ["Distribuzione dell'offerta","Supply Distribution"],
    ["Distribuzione e Holder","Distribution & Holders"],
    ["NON IN STAKING","NOT STAKED"],
    ["INJ staking e supply dal nodo Injective · Prezzo e ATH/ATL da CoinGecko.","INJ staking and supply from the Injective node · Price and ATH/ATL from CoinGecko."],
    ["Allocazione storica · saldi wallet salvati","Historical allocation · saved wallet balances"],
    ["Allocazione iniziale di 100 milioni INJ","Initial allocation of 100 million INJ"],
    ["Non verificato","Not verified"],
    ["Il 20% assegnato al team nel 2020 NON rappresenta quanti INJ possieda oggi Injective Labs. Il possesso attuale non è verificato e non può essere dedotto dalla supply circolante.","The 20% allocated to the team in 2020 does NOT represent Injective Labs' current holdings. Current holdings are unverified and cannot be inferred from circulating supply."],
    ["Fonte: documento SEC · allocazione genesis ↗","Source: SEC document · genesis allocation ↗"],
    ["Fasce indicative calcolate sui wallet salvati in INJ Node. Il rank è interno ai tuoi wallet, non la posizione nella classifica mondiale.","Indicative tiers are calculated from saved INJ Node wallets. Ranking is among your wallets, not a global holder ranking."],
    ["Per una classifica mondiale affidabile servirebbe un indice completo degli indirizzi nativi Injective, con i fondi delegati inclusi. Non vengono mostrati rank globali stimati.","A reliable global ranking would require a complete index of native Injective addresses, including delegated holdings. Estimated global ranks are not shown."],
    ["Informazioni sull'explorer ufficiale InjScan ↗","Information from the official InjScan explorer ↗"],
    ["Mercato crypto","Crypto market"],
    ["I tuoi preferiti","Your favorites"],
    ["Salva le crypto toccando la stella nella lista o nella Heatmap","Save coins by tapping the star in the list or Heatmap"],
    ["Lista","List"],
    ["Gestisci","Manage"],
    ["Annulla","Cancel"],
    ["Verde: rialzo · Rosso: ribasso","Green: up · Red: down"],
    ["Trascina per lo storico · +/− per zoom","Drag to explore history · +/− to zoom"],
    ["Scorrimento tattile (prova iPhone)","Touch scrolling (try on iPhone)"],
    ["Feedback a scatti se previsto da iOS","Haptic feedback where supported by iOS"],
    ["Rimuovere dai preferiti?","Remove from favorites?"],
    ["Rimuovi","Remove"],
    ["Tutti i wallet","All wallets"],
    ["Wallet della Home","Home wallet"],
    ["Wallet specifico","Specific wallet"],
    ["Linee","Lines"],
    ["Candele","Candles"],
    ["Porta davanti","Bring forward"],
    ["Porta dietro","Send backward"],
    ["Duplica","Duplicate"],
    ["Aggiungi","Add"],
    ["Modifica","Edit"],
    ["Scegli monete","Choose coins"],
    ["Selezione fissa","Fixed selection"],
    ["Cerca crypto","Search coins"],
    ["Elementi disponibili","Available elements"],
    ["Crea preset","Create preset"],
    ["Salva preset","Save preset"],
    ["Scegli preset","Choose preset"],
    ["Blocca","Lock"],
    ["Sblocca","Unlock"],
    ["Schermo intero","Fullscreen"],
    ["Visualizzazione","View"],
    ["Chiudi","Close"],
    ["SIMULATORE","SIMULATOR"],
    ["IL TUO PATRIMONIO, A QUALSIASI PREZZO","YOUR PORTFOLIO, AT ANY PRICE"],
    ["Immagina un prezzo per INJ e scopri quanto varrebbe il tuo patrimonio.","Enter an INJ price and discover the potential value of your portfolio."],
    ["PREZZO IPOTETICO DI 1 INJ","HYPOTHETICAL PRICE OF 1 INJ"],
    ["Inserisci un prezzo e la simulazione si aggiorna immediatamente.","Enter a price and the simulation updates immediately."],
    ["SINCRONIZZAZIONE","SYNCING"],
    ["NET WORTH SIMULATO","SIMULATED NET WORTH"],
    ["Disponibili + staking + reward","Available + staked + rewards"],
    ["SOLO STAKING","STAKING ONLY"],
    ["Solo INJ effettivamente delegati","Delegated INJ only"],
    ["TUTTI I WALLET · SIMULAZIONE","ALL WALLETS · SIMULATION"],
    ["PATRIMONIO TOTALE","TOTAL PORTFOLIO VALUE"],
    ["RENDITA POTENZIALE DA STAKING · USD","POTENTIAL STAKING YIELD · USD"],
    ["APR IN AGGIORNAMENTO","APR UPDATING"],
    ["PERIODO","PERIOD"],
    ["Rendita stimata al prezzo ipotetico e APR netto, senza compound.","Estimated rewards at the hypothetical price and net APR, without compounding."],
    ["CRESCITA DELLO STAKING","STAKING GROWTH"],
    ["APR IN ATTESA","WAITING FOR APR"],
    ["1 anno / year","1 year"],
    ["2 anni / years","2 years"],
    ["3 anni / years","3 years"],
    ["5 anni / years","5 years"],
    ["7 anni / years","7 years"],
    ["10 anni / years","10 years"],
    ["15 anni / years","15 years"],
    ["20 anni / years","20 years"],
    ["25 anni / years","25 years"],
    ["30 anni / years","30 years"],
    ["Wallet selezionato dalla Home","Wallet selected on Home"],
    ["Reinvesti ogni giorno","Reinvest daily"],
    ["Non reinvestire","Do not reinvest"],
    ["Trascina sul grafico per esplorare gli anni","Drag the chart to explore the years"],
    ["Senza compound","Without compounding"],
    ["Con compound","With compounding"],
    ["Compound giornaliero","Daily compounding"],
    ["INJ EXTRA CON COMPOUND","EXTRA INJ FROM COMPOUNDING"],
    ["SCENARIO SELEZIONATO","SELECTED SCENARIO"],
    ["INJ AL GIORNO A FINE PERIODO","INJ PER DAY AT PERIOD END"],
    ["STAKING INIZIALE","INITIAL STAKING"],
    ["Proiezione indicativa ad APR costante.","Illustrative projection at constant APR."],
    ["Simulazione indicativa: valorizza esclusivamente gli INJ, senza stimare altri token, commissioni o imposte.","Illustrative simulation: values INJ only, excluding other tokens, fees and taxes."],
    ["Quanto potrebbe valere?","What could it be worth?"],
    ["Scegli A e B. Il confronto e il valore ipotetico del wallet sono calcolati automaticamente.","Choose A and B. The comparison and hypothetical wallet value are calculated automatically."],
    ["ASSET DI PARTENZA","STARTING ASSET"],
    ["Cerca crypto per nome o simbolo","Search coins by name or symbol"],
    ["MARKET CAP ATTUALE","CURRENT MARKET CAP"],
    ["PREZZO ATTUALE","CURRENT PRICE"],
    ["OFFERTA CIRCOLANTE","CIRCULATING SUPPLY"],
    ["MARKET CAP DI RIFERIMENTO","REFERENCE MARKET CAP"],
    ["Cerca la crypto di riferimento","Search reference coin"],
    ["Cerca per nome o ticker","Search by name or ticker"],
    ["Capitalizzazione di riferimento","Reference market capitalization"],
    ["Unità · USD","Units · USD"],
    ["Miliardi (B)","Billions (B)"],
    ["Migliaia di miliardi (T)","Trillions (T)"],
    ["Milioni (M)","Millions (M)"],
    ["USD interi","Whole USD"],
    ["Le capitalizzazioni sono automatiche: nessun valore da inserire a mano.","Market caps are automatic: no need to enter a value manually."],
    ["CAPITALIZZAZIONE DI RIFERIMENTO","REFERENCE MARKET CAPITALIZATION"],
    ["RISULTATO","RESULT"],
    ["Scenario a pari market cap","Equal-market-cap scenario"],
    ["ANALISI","ANALYSIS"],
    ["MOLTIPLICATORE","MULTIPLIER"],
    ["Rapporto fra capitalizzazioni","Ratio between market caps"],
    ["PREZZO TEORICO","THEORETICAL PRICE"],
    ["Offerta circolante invariata","Assuming unchanged circulating supply"],
    ["VARIAZIONE TEORICA","THEORETICAL CHANGE"],
    ["Rispetto al prezzo attuale","Relative to current price"],
    ["Mostra i dettagli del calcolo","Show calculation details"],
    ["Simulazione matematica: non prevede il prezzo futuro, non considera variazioni dell'offerta, liquidità o impatto di mercato.","Mathematical simulation, not a forecast. It excludes supply changes, liquidity and market impact."],
    ["Valore del wallet selezionato","Selected wallet value"],
    ["INJ POSSEDUTI","INJ HOLDINGS"],
    ["INJ al prezzo attuale","INJ at current price"],
    ["VALORE ATTUALE · USD","CURRENT VALUE · USD"],
    ["VALORE IPOTETICO · USD","HYPOTHETICAL VALUE · USD"],
    ["Se INJ raggiungesse la market cap selezionata","If INJ reached the selected market cap"],
    ["Il controvalore ipotetico si calcola quando la crypto di partenza è INJ. Il wallet non viene modificato.","Hypothetical value is calculated when INJ is the starting asset. Your wallet is not changed."],
    ["Fonti: CoinGecko (crypto), Nasdaq giornaliero (azioni USA), stime parziali indici supportati.","Sources: CoinGecko (crypto), daily Nasdaq (US equities), partial estimates for supported indices."],
    ["Ogni dollaro maturato avvicina al traguardo successivo. Le barre seguono i reward disponibili, non il patrimonio investito.","Every dollar earned moves you closer to the next milestone. Bars track available rewards, not invested capital."],
    ["PRODUZIONE STIMATA / GIORNO","ESTIMATED PRODUCTION / DAY"],
    ["NOVE TRAGUARDI","NINE MILESTONES"],
    ["La tua progressione","Your progress"],
    ["Countdown stimati assumendo prezzo INJ e APR netto costanti. I reward vengono verificati on-chain; tra due sincronizzazioni la progressione è una stima. Un claim o reinvestimento modifica le barre.","Estimated countdowns assume constant INJ price and net APR. Rewards are verified on-chain; between updates the progress is estimated. A claim or reinvestment changes the bars."],
    ["Aggiorna dati","Refresh data"],
    ["Le tue impostazioni, su tutti i tuoi dispositivi.","Your settings, on all your devices."],
    ["Verifica del servizio…","Checking service…"],
    ["Il tuo account privato","Your private account"],
    ["Collega una passkey protetta dal dispositivo. Puoi usare Face ID, Touch ID o una chiave di sicurezza supportata. Nessuna password da ricordare.","Link a device-protected passkey. You can use Face ID, Touch ID, or a supported security key. No passwords to remember."],
    ["CREA ACCOUNT","CREATE ACCOUNT"],
    ["ACCEDI CON PASSKEY","SIGN IN WITH PASSKEY"],
    ["Non viene inviato nulla al cloud finché non scegli di salvare. Utilizza preferibilmente il dominio definitivo di INJ Node: le passkey sono associate al dominio.","Nothing is uploaded until you choose to save. Prefer the final INJ Node domain: passkeys are tied to the domain."],
    ["Account collegato","Connected account"],
    ["● CONNESSO","● CONNECTED"],
    ["STATO CLOUD","CLOUD STATUS"],
    ["Non ancora salvato","Not saved yet"],
    ["ULTIMO BACKUP","LAST BACKUP"],
    ["VOCI LOCALI","LOCAL ITEMS"],
    ["Nessun backup automatico iniziale. Scegli tu se inviare le impostazioni locali o ripristinare quelle archiviate.","No automatic initial backup. Choose whether to upload local settings or restore the saved backup."],
    ["SALVA SUL CLOUD","SAVE TO CLOUD"],
    ["RIPRISTINA SU QUESTO DISPOSITIVO","RESTORE TO THIS DEVICE"],
    ["Backup automatico","Automatic backup"],
    ["Disponibile dopo il primo salvataggio manuale. Controlla modifiche ogni 15 secondi; non sovrascrive versioni cloud diverse.","Available after the first manual save. Checks for changes every 15 seconds and does not overwrite different cloud versions."],
    ["AGGIUNGI UN'ALTRA PASSKEY","ADD ANOTHER PASSKEY"],
    ["ESCI","SIGN OUT"],
    ["ELIMINA ACCOUNT CLOUD","DELETE CLOUD ACCOUNT"],
    ["SYNC FACOLTATIVA","OPTIONAL SYNC"],
    ["NESSUNA CHIAVE PRIVATA","NO PRIVATE KEYS"],
    ["PRE-LANCIO","PRE-LAUNCH"],
    ["NASDAQ (PREVISTA)","NASDAQ (PROPOSED)"],
    ["STATO DEL FONDO","FUND STATUS"],
    ["Il prossimo capitolo di Injective sui mercati tradizionali.","The next chapter of Injective in traditional markets."],
    ["LEGGI IL PROSPETTO SEC ↗","READ SEC PROSPECTUS ↗"],
    ["INJ SPOT · IN CONNESSIONE","INJ SPOT · CONNECTING"],
    ["Mercato crypto 24/7","24/7 crypto market"],
    ["Nessuna quotazione confermata","No confirmed listing"],
    ["Disponibili dopo il lancio","Available after launch"],
    ["Prezzo INJ spot e prezzo della quota ETF sono strumenti differenti.","INJ spot price and the ETF share price are different instruments."],
    ["LA QUOTA ETF NON EQUIVALE A 1 INJ","ONE ETF SHARE DOES NOT EQUAL 1 INJ"],
    ["CARICA GRAFICO","LOAD CHART"],
    ["Fonte grafico: TradingView · provider esterno","Chart source: TradingView · external provider"],
    ["APRI SU TRADINGVIEW ↗","OPEN ON TRADINGVIEW ↗"],
    ["Capitale seed previsto (fino a)","Proposed seed capital (up to)"],
    ["Prezzo quota seed previsto","Proposed seed share price"],
    ["Sottostante","Underlying asset"],
    ["Borsa proposta","Proposed exchange"],
    ["I 15 milioni e i 25 dollari sono valori di seed indicati nel prospetto, non flussi già registrati né il prezzo di mercato futuro.","$15 million and $25 are proposed seed values in the prospectus, not recorded flows or a future market price."],
    ["STATO DOCUMENTALE AL 23 OTT 2026","DOCUMENT STATUS AS OF OCT 23, 2026"],
    ["Emendamento n. 4 depositato · 23/10/2026","Amendment no. 4 filed · Oct 23, 2026"],
    ["Efficacia non confermata","Effectiveness unconfirmed"],
    ["Data ancora da confermare","Date not yet confirmed"],
    ["Prezzo e volumi quando disponibili","Price and volume when available"],
    ["SCENARIO PREVISTO NEL PROSPETTO","PROPOSED PROSPECTUS SCENARIO"],
    ["reward netti al fondo","net rewards to the fund"],
    ["commissioni staking","staking fees"],
    ["Il piano prevede di destinare parte degli INJ del fondo allo staking. Il 70% indicato riguarda la ripartizione dei reward, non un rendimento annuo del 70%. Struttura soggetta a modifiche.","The plan involves staking a portion of the fund's INJ. The stated 70% refers to reward allocation, not a 70% annual yield. Terms may change."],
    ["INJ NODE BY B CAPITAL GROUP · SYNC FACOLTATIVA · NESSUNA CHIAVE PRIVATA","INJ NODE BY B CAPITAL GROUP · OPTIONAL SYNC · NO PRIVATE KEYS"],
    ["Solo eventi con consenso · dati aggregati · dashboard privata","Consented events only · aggregated data · private dashboard"],
    ["ULTIME ATTIVITÀ","RECENT ACTIVITY"],
    ["Dispositivi","Devices"],
    ["Utenti","Users"],
    ["Ieri","Yesterday"],
    ["Ultimi 7 giorni","Last 7 days"],
    ["Ultimi 30 giorni","Last 30 days"],
    ["Nessun risultato","No results"],
    ["Nessun dato","No data"],
    ["Caricamento…","Loading…"],
    ["Salva","Save"],
    ["Ripristina","Restore"],
    ["Riprova","Retry"],
    ["Errore di rete","Network error"],
    ["INJ NODE | Mercato","INJ NODE | Market"],
    ["Valore Potenziale · INJ Node","Potential Value · INJ Node"],
  );

  pairs.push(
    ["Confronto capitalizzazioni","Market Cap Comparison"],
    ["Scala ricompense","Reward Ladder"],
    ["Spazio di lavoro","Workspace"],
    ["Spazio di lavoro INJ","INJ Workspace"],
    ["Analisi INJ","INJ Intelligence"],
    ["TUTTO","ALL"],
    ["SCORRI","SCROLL"],
    ["Cronologia visibile","Visible history"],
    ["Visualizzazione cronologia","Timeline layout"],
    ["Controlli Performance Timeline","Performance Timeline controls"],
    ["Metrica Performance Timeline","Performance Timeline metric"],
    ["Riepilogo Performance Timeline","Performance Timeline summary"],
    ["Cronologia profit e loss giornaliero","Daily profit and loss history"],
    ["INJ Node Dashboard, torna in alto","INJ Node Dashboard, back to top"],
    ["Apri calendario Market Events","Open Market Events calendar"],
    ["Chiudi Market Events","Close Market Events"],
    ["Filtra gli eventi per giorno o settimana","Filter events by day or week"],
    ["Calendario macroeconomico · solo impatto ★★★","Macroeconomic calendar · ★★★ impact only"],
    ["MARKET EVENTS","EVENTI DI MERCATO"],
    ["EVENTI DI MERCATO","MARKET EVENTS"],
    ["GRAFICI","CHARTS"],
    ["RICOMPENSE","REWARDS"],
    ["Torna","Back"],
    ["Cerca o aggiungi wallet","Search or add a wallet"],
    ["Stato connessione","Connection status"],
    ["Freschezza dati live","Live data freshness"],
    ["Apri grafico Injective","Open Injective chart"],
  );

  pairs.push(
    ["Caricamento dati crypto…","Loading crypto data…"],
    ["Valore potenziale","Potential value"],
    ["PnL totale —","Total PnL —"],
    ["Aggiungi, rinomina e seleziona i wallet senza riavviare INJ Node. Sono necessari solo indirizzi pubblici.","Add, rename and select wallets without restarting INJ Node. Only public addresses are required."],
    ["Il tuo riepilogo INJ","Your INJ summary"],
    ["Dati in aggiornamento","Updating data"],
    ["SCORRI PER LE ALTRE DATE","SCROLL FOR OTHER DATES"],
    ["Questa settimana","This week"],
    ["PROSSIMO TRA","NEXT IN"],
    ["Orari del dispositivo · dati effettivi solo dopo la pubblicazione · avvisi con app aperta.","Device local times · actual figures after release · notifications while app is open."],
    ["Caricamento del calendario macroeconomico…","Loading economic calendar…"],
    ["Grafico","Chart"],
    ["Prezzo","Price"],
    ["Caricamento dati di mercato…","Loading market data…"],
    ["Dati di mercato forniti da CoinGecko","Market data provided by CoinGecko"],
    ["Dati crypto CoinGecko · USD","CoinGecko crypto data · USD"],
    ["In attesa dei dati…","Waiting for data…"],
    ["01 / IDENTITÀ PERSONALE","01 / PERSONAL IDENTITY"],
    ["02 / IL TUO ARCHIVIO","02 / YOUR ARCHIVE"],
    ["STORICO · DATI LIVE ATTIVI","HISTORY · LIVE DATA ACTIVE"],
    ["STAKING TOTALE","TOTAL STAKED"],
    ["Tocca direttamente l’interruttore per verificare il Taptic Engine. Test sperimentale.","Tap the switch directly to test the Taptic Engine. Experimental test."],
    ["PROSSIMO EVENTO","NEXT EVENT"],
    ["Gli orari sono mostrati nel tuo fuso locale; i dati effettivi compaiono solo dopo la pubblicazione.","Times are shown in your local time zone; actual figures appear only after publication."],
    ["Accesso riservato all'amministratore. Analisi degli accessi live, del tempo di utilizzo, dei wallet osservati e delle aree geografiche.","Administrator-only access. Analysis of live visits, time spent, viewed wallets and geographic areas."],
    ["ACCEDI ALLE STATISTICHE","SIGN IN TO ANALYTICS"],
    ["La sessione è protetta dal server. Non memorizziamo la password sul dispositivo.","Your session is protected by the server. We do not store the password on your device."],
    ["Le statistiche sono protette. Il database e il collegamento con Insights devono essere attivi per visualizzare dati reali.","Analytics are protected. The database and Insights connection must be active to show real data."],
    ["CARICAMENTO DATI","LOADING DATA"],
    ["TUTTO LO STORICO","ALL HISTORY"],
    ["TUTTE LE SEZIONI","ALL SECTIONS"],
    ["Dati aggregati con consenso; nessun identificatore personale o geolocalizzazione GPS.","Aggregated data with consent; no personal identifiers or GPS geolocation."],
    ["Stima per sessione","Estimate per session"],
    ["Sezioni con interazioni","Interacted sections"],
    ["Località approssimative; seleziona un punto per filtrare","Approximate locations; select a pin to filter"],
    ["Punti approssimativi, derivati dal paese/città indicati dalla rete. Non rappresentano posizioni GPS.","Approximate points from network-reported country or city, not GPS positions."],
    ["ZONE PIÙ ATTIVE","MOST ACTIVE AREAS"],
    ["Gruppi aggregati per area e dispositivo, senza identificare i visitatori","Aggregated by area and device without identifying visitors"],
    ["Transizioni aggregate, calcolate senza identificare le persone","Aggregated transitions without identifying individuals"],
    ["FUNZIONALITÀ UTILIZZATE","FEATURES USED"],
    ["Gli errori sono conteggi per categoria, senza messaggi, stack, URL o identificatori personali. Lo stato attuale dell’API non costituisce una misura certificata dell’uptime.","Errors are counted by category, without messages, stacks, URLs or personal identifiers. The current API state is not a certified uptime measure."],
    ["Generato dai dati effettivamente disponibili per il periodo e i filtri selezionati","Generated from actual available data for the selected period and filters"],
    ["STAMPA / SALVA PDF","PRINT / SAVE PDF"],
    ["INSIGHTS PRO · Solo sessioni con consenso · Geografia approssimativa · Nessun ID di sessione, IP, GPS o chiave privata nei report","INSIGHTS PRO · Consented sessions only · Approximate geography · No session ID, IP, GPS or private keys in reports"],
    ["Dall'attivazione del monitoraggio","Since monitoring began"],
    ["Tempo attivo stimato per sessione","Estimated active time per session"],
    ["Zone di provenienza indicative degli accessi · storico persistente","Approximate origin areas of visits · persistent history"],
    ["Le aree con più accessi registrati","Areas with the most recorded visits"],
    ["Nessuna area registrata","No areas recorded"],
    ["SEZIONI PIÙ VISITATE","MOST VISITED SECTIONS"],
    ["WALLET PIÙ OSSERVATI","MOST VIEWED WALLETS"],
    ["Distribuzione delle sessioni per dispositivo","Session distribution by device"],
  );

  const exactIT = new Map();
  const exactEN = new Map();
  for (const [it, en] of pairs) {
    exactIT.set(it, it);
    exactIT.set(en, it);
    exactEN.set(it, en);
    exactEN.set(en, en);
  }

  const itPhrases = [
    ['TOTAL MANAGED','TOTALE GESTITO'], ['ALLOCATION','ASSEGNAZIONE'], ['REWARD VELOCITY','VELOCITÀ REWARD'], ['NEXT MILESTONE','PROSSIMA SOGLIA'],
    ['TOTAL INJ GROWTH','CRESCITA TOTALE INJ'], ['TOTAL NET WORTH GROWTH','CRESCITA PATRIMONIO TOTALE'], ['TREASURY PERFORMANCE','PERFORMANCE TREASURY'],
    ['BEST DAY','GIORNO MIGLIORE'], ['WORST DAY','GIORNO PEGGIORE'], ['CURRENT TOTAL','TOTALE ATTUALE'], ['CURRENT VALUE','VALORE ATTUALE'], ['SINCE FIRST DATA','DAL PRIMO DATO'],
    ['AVAILABLE REWARDS','REWARD DISPONIBILI'], ['AVAILABLE INJ','INJ DISPONIBILI'], ['STAKED','IN STAKING'], ['SHARE OF TOTAL','QUOTA DEL TOTALE'],
    ['FIRST READING','PRIMA LETTURA'], ['LIVE HISTORY','STORICO LIVE'], ['LAST TRADE','ULTIMO SCAMBIO'], ['LAST TICK','ULTIMO TICK'], ['SIZE INJ','QUANTITÀ INJ'],
    ['PRICE','PREZZO'], ['OPEN','APERTURA'], ['HIGH','MASSIMO'], ['LOW','MINIMO'], ['CHANGE','VARIAZIONE'], ['DEPTH LIVE','PROFONDITÀ LIVE']
  ];

  const enPhrases = [
    ['Command Center può essere aperto solo da PC.','Command Center can only be opened on a PC.'],
    ['Impossibile verificare il wallet. Controlla l’indirizzo o la connessione e riprova.','Unable to verify the wallet. Check the address or connection and try again.'],
    ['Connessione disponibile','Connection available'], ['Nessuna connessione','No connection'], ['NON DISPONIBILE','UNAVAILABLE'], ['In attesa del mercato','Waiting for market'],
    ['IN ATTESA','WAITING'], ['Wallet non aggiornato','Wallet not updated'], ['Valore precedente disponibile','Previous value available'], ['Calcolo APR in corso','Calculating APR'],
    ['Prezzo INJ in attesa…','Waiting for INJ price…'], ['Grafico Price Home non disponibile','Home price chart unavailable'], ['Tutti i sistemi operativi','All systems operational'],
    ['Alcuni servizi richiedono attenzione','Some services need attention'], ['Connessione non disponibile','Connection unavailable'],
    ['Mercato, wallet e APR stanno rispondendo normalmente.','Market, wallet and APR are responding normally.'],
    ['INJ Node continua a usare i dati disponibili mentre tenta la riconnessione.','INJ Node continues using available data while attempting to reconnect.'],
    ['Controlla la connessione del dispositivo e riprova.','Check the device connection and try again.'], ['Tutti i servizi operativi','All services operational'],
    ['Sincronizzazione del P/L giornaliero…','Syncing daily P/L…'],
    ['Oggi è la prima candela salvata su questo dispositivo. Lo storico cresce giorno per giorno.','Today is the first candle saved on this device. History grows day by day.'],
    ['Dati giornalieri non ancora disponibili. INJ Node riproverà con il prossimo aggiornamento live.','Daily data is not available yet. INJ Node will retry on the next live update.'],
    ['Chiudi ricerca wallet','Close wallet search'], ['Apri ricerca wallet','Open wallet search'], ['Aggiungi un wallet con la lente','Add a wallet with search'], ['Wallet attivo','Active wallet'],
    ['Nessun wallet','No wallet'], ['Attivo','Active'], ['Rete Injective non disponibile','Injective network unavailable'], ['Apertura giornata non disponibile','Day open unavailable'],
    ['ETA non disponibile','ETA unavailable'], ['Avanzamento reward non disponibile','Reward progress unavailable'], ['Reward giornaliero non disponibile','Daily reward unavailable'],
    ['Nessuna delegazione trovata per questo wallet.','No delegations found for this wallet.'], ['Tutti gli account sono aggiornati','All accounts are up to date'],
    ['Storico mercato non disponibile','Market history unavailable'], ['Storico non disponibile','History unavailable'], ['Nascondi valori saldo','Hide balance values'],
    ['In attesa dei dati live','Waiting for live data'], ['Installazione disponibile','Installation available'],
    ['Su iPhone: Condividi → Aggiungi a schermata Home','On iPhone: Share → Add to Home Screen'], ['Usa il menu del browser → Installa app','Use the browser menu → Install app'],
    ['Azzerare lo storico di Crescita Treasury e Andamento patrimonio? I grafici ripartiranno dai prossimi dati reali.','Reset Treasury Growth and Portfolio Trend history? Charts will restart from the next real data.'],
    ['Puoi scegliere un nome riconoscibile. L’indirizzo resta salvato solo su questo dispositivo.','You can choose a recognizable name. The address remains stored only on this device.'],
    ['Si sblocca dopo 7 giorni di storico accumulato','Unlocks after 7 days of accumulated history'], ['Si sblocca dopo 30 giorni di storico accumulato','Unlocks after 30 days of accumulated history'],
    ['ULTIMI 7 GIORNI','LAST 7 DAYS'], ['MESE IN CORSO','CURRENT MONTH'], ['Servono 2 giorni','2 days required'], ['Rete Injective temporaneamente non disponibile','Injective network temporarily unavailable'],
    ['In attesa di storico reale','Waiting for real history'], ['IN RITARDO','DELAYED'], ['Flusso mercato interrotto: ultimo prezzo conservato.','Market feed interrupted: last price retained.'],
    ['Flusso mercato ripristinato.','Market feed restored.'], ['Flusso mercato connesso.','Market feed connected.'], ['Storico parziale','Partial history'], ['PREZZO MEDIO','AVERAGE PRICE']
  ];

  function replacePhrases(value, list) {
    let out = value;
    const sorted = list.slice().sort((a,b) => b[0].length - a[0].length);
    for (const [from, to] of sorted) out = out.split(from).join(to);
    return out;
  }

  function dynamicEN(s) {
    let out = replacePhrases(s, enPhrases);
    out = out
      .replace(/^Vai a (.+)$/,'Go to $1')
      .replace(/^Seleziona (.+)$/,'Select $1')
      .replace(/^Apri dettaglio (.+)$/,'Open details for $1')
      .replace(/^Apri (.+)$/,'Open $1')
      .replace(/^Chiudi (.+)$/,'Close $1')
      .replace(/^Rimuovere “(.+)” dai wallet salvati\?$/,'Remove “$1” from saved wallets?')
      .replace(/\bUltimo tick\b/g,'Last tick')
      .replace(/\bUltimo dato\b/g,'Last data')
      .replace(/\bUltimo prezzo\b/g,'Last price')
      .replace(/\bwallet aggiornati\b/g,'wallets updated')
      .replace(/\bsalvato\b/g,'saved').replace(/\bsalvati\b/g,'saved')
      .replace(/\bgiorni\b/g,'days').replace(/\bgiorno\b/g,'day').replace(/\banni\b/g,'years').replace(/\banno\b/g,'year')
      .replace(/\/ giorno\b/g,'/ day').replace(/\/giorno\b/g,'/day')
      .replace(/\bMancano\b/g,'Remaining').replace(/\bmancanti\b/g,'remaining')
      .replace(/\bTema attuale\b/g,'Current theme').replace(/\bTema:\s*/g,'Theme: ')
      .replace(/\. Cambia tema\b/g,'. Change theme')
      .replace(/\bLivello (\d+) attraversato al rialzo:/g,'Level $1 crossed upward:')
      .replace(/\bLivello (\d+) attraversato al ribasso:/g,'Level $1 crossed downward:')
      .replace(/\bOltre 40 years \/ n\.d\./g,'Over 40 years / n/a')
      .replace(/\bOltre 40 anni \/ n\.d\./g,'Over 40 years / n/a')
      .replace(/\bStima netta\b/g,'Net estimate')
      .replace(/\bmaturate\b/g,'accrued')
      .replace(/\boggi\b/gi,'today')
      .replace(/\badesso\b/gi,'now');
    return out;
  }

  function dynamicIT(s) {
    let out = replacePhrases(s, itPhrases);
    out = out
      .replace(/^Go to (.+)$/,'Vai a $1').replace(/^Select (.+)$/,'Seleziona $1').replace(/^Open details for (.+)$/,'Apri dettaglio $1')
      .replace(/^Open (.+)$/,'Apri $1').replace(/^Close (.+)$/,'Chiudi $1')
      .replace(/^Remove “(.+)” from saved wallets\?$/,'Rimuovere “$1” dai wallet salvati?')
      .replace(/\bLast data\b/g,'Ultimo dato').replace(/\bLast price\b/g,'Ultimo prezzo')
      .replace(/\bwallets updated\b/g,'wallet aggiornati').replace(/\bCurrent theme\b/g,'Tema attuale').replace(/\bTheme:\s*/g,'Tema: ')
      .replace(/\. Change theme\b/g,'. Cambia tema').replace(/\bNet estimate\b/g,'Stima netta')
      .replace(/\bOver 40 years \/ n\/a\b/g,'Oltre 40 anni / n.d.');
    return out;
  }

  function translateString(value, target = lang) {
    if (value == null) return value;
    const raw = String(value);
    const leading = raw.match(/^\s*/)?.[0] || '';
    const trailing = raw.match(/\s*$/)?.[0] || '';
    const core = raw.trim();
    if (!core) return raw;
    const map = target === 'en' ? exactEN : exactIT;
    let result = map.get(core) || core;
    result = target === 'en' ? dynamicEN(result) : dynamicIT(result);
    return leading + result + trailing;
  }

  function translateElement(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.closest?.('[data-i18n-skip="true"]') && !el.matches?.('[data-inj-section-name]')) return;
    // Use explicit bilingual copy for static labels, never for live data or nested controls.
    if (el.id !== 'injMarketNextSummary' && el.hasAttribute('data-it') && el.hasAttribute('data-en') && !el.children.length) {
      const it=el.getAttribute('data-it')||'', en=el.getAttribute('data-en')||'';
      const old=el.textContent.trim();
      if (old===it.trim() || old===en.trim()) {
        const next=lang==='en'?en:it;
        if(el.textContent!==next)el.textContent=next;
      }
    }
    // The Home descriptions always follow the chosen language, even after
    // a theme switch, a live update or a return to this already-mounted page.
    if (el.classList?.contains('inj-tile-description') || el.classList?.contains('inj-home-tile-title')) {
      const localized = el.getAttribute(lang === 'en' ? 'data-en' : 'data-it');
      if (localized != null) {
        if (el.firstChild?.nodeType === 3 && el.childNodes.length === 1) {
          if (el.firstChild.nodeValue !== localized) el.firstChild.nodeValue = localized;
        } else if (el.textContent !== localized) {
          el.textContent = localized;
        }
      }
    }
    for (const attr of ['aria-label', 'title', 'placeholder']) {
      if (el.hasAttribute?.(attr)) {
        const old = el.getAttribute(attr);
        const next = translateString(old);
        if (next !== old) el.setAttribute(attr, next);
      }
    }
  }

  function translateNode(root) {
    if (!root) return;
    applying = true;
    try {
      if (root.nodeType === 3) {
        const parent = root.parentElement;
        if (!parent || (parent.closest?.('[data-i18n-skip="true"], .inj-home-tile-title, script, style, textarea') && !parent.matches?.('[data-inj-section-name]'))) return;
        const next = translateString(root.nodeValue);
        if (next !== root.nodeValue) root.nodeValue = next;
        return;
      }
      if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
      if (root.nodeType === 1) translateElement(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === 1) translateElement(node);
        else {
          const parent = node.parentElement;
          if (!parent || (parent.closest?.('[data-i18n-skip="true"], script, style, textarea') && !parent.matches?.('[data-inj-section-name]'))) continue;
          const next = translateString(node.nodeValue);
          if (next !== node.nodeValue) node.nodeValue = next;
        }
      }
    } finally { applying = false; }
  }

  function updateControls() {
    document.querySelectorAll('[data-language-choice]').forEach((button) => {
      const active = button.dataset.languageChoice === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const value = document.getElementById('languageValue');
    if (value) value.textContent = lang.toUpperCase();
  }

  function applyLanguage(nextLang, persist = true) {
    if (!VALID.has(nextLang)) return;
    lang = nextLang;
    if (persist) writeStoredLanguage(lang);
    document.documentElement.lang = lang;
    document.title=translateString(document.title,lang);
    translateNode(document.body || document.documentElement);
    updateControls();
    window.dispatchEvent(new CustomEvent('injnode:languagechange', { detail: { language: lang } }));
  }

  function bindControls() {
    document.querySelectorAll('[data-language-choice]').forEach((button) => {
      if (button.dataset.i18nBound === '1') return;
      button.dataset.i18nBound = '1';
      button.addEventListener('click', () => applyLanguage(button.dataset.languageChoice, true));
    });
    updateControls();
  }

  let observer;
  // Translate realtime text updates before the next paint.
  const pending = new Set();

  function observe() {
    if (!observer || !document.documentElement) return;
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label','title','placeholder']
    });
  }

  function flushMutations() {
    if (!pending.size) return;
    observer?.disconnect();
    applying = true;
    try {
      const nodes = Array.from(pending);
      pending.clear();
      for (const node of nodes) {
        if (!node || !node.isConnected) continue;
        translateNode(node.nodeType === 3 ? node : node);
      }
      bindControls();
    } catch (_) {
      // Translation must never be able to break the core application.
    } finally {
      applying = false;
      observe();
    }
  }

  observer = new MutationObserver((mutations) => {
    if (applying) return;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' || mutation.type === 'attributes') pending.add(mutation.target);
      else mutation.addedNodes.forEach((node) => pending.add(node));
    }
    flushMutations();
  });

  function safeApply(nextLang, persist = true) {
    try { applyLanguage(nextLang, persist); } catch (_) { updateControls(); }
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'injnode:languagechange') return;
    if (VALID.has(event.data.language) && event.data.language !== lang) safeApply(event.data.language, true);
  });
  window.addEventListener('storage', event => { if(event.key===STORAGE_KEY && VALID.has(event.newValue))safeApply(event.newValue,false); });
  window.addEventListener('pageshow',()=>{const saved=readStoredLanguage();if(VALID.has(saved)&&saved!==lang)safeApply(saved,false);});
  function start() {
    bindControls();
    // Apply the stored language immediately at DOM-ready and translate
    // subsequent live updates synchronously with the mutation microtask.
    safeApply(lang, false);
    observe();
  }

  window.INJ_I18N = {
    getLanguage: () => lang,
    setLanguage: (next) => safeApply(next, true),
    t: (value) => translateString(value, lang),
    translate: translateNode
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
