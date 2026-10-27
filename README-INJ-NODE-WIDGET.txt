INJ NODE — WIDGET IPHONE (SCRIPTABLE)

Cosa mostra: prezzo INJ, variazione dal giorno precedente alle 23:00, reward non riscossi letti tramite le API pubbliche della blockchain Injective, dettaglio multi-wallet sul widget grande.

INSTALLAZIONE:
1. Installa l'app Scriptable dall'App Store.
2. Copia il contenuto del file inj-node-scriptable-widget.js in un nuovo script Scriptable chiamato INJ Node.
3. Eseguilo una volta e scegli "Configura / modifica".
4. Incolla gli indirizzi pubblici inj1 separati da virgole, imposta EUR/USD e, se vuoi, l'APR netto percentuale per una stima della produzione notturna.
5. Sulla Home di iPhone aggiungi un widget Scriptable. Apri "Modifica widget", seleziona lo script INJ Node. Scegli il formato piccolo, medio o grande.

OPZIONI:
- Parametro widget ALL: tutti i wallet.
- Parametro widget 1, 2, 3 ecc.: uno dei wallet configurati, nell'ordine.
- Gli indirizzi restano nei file locali di Scriptable sul telefono, non sono presenti nel codice pubblico.
- Per modificare la configurazione, riapri lo script direttamente dall'app Scriptable.

PRECISIONE:
- "REWARD DISPONIBILI" = reward non riscossi rilevati dai wallet tramite API Injective.
- "DELTA REWARD" = differenza dei reward non riscossi rispetto a un campione raccolto vicino alle 23:00, se il widget era stato aggiornato in quella finestra. Prelievi/reinvestimenti possono alterare questo valore.
- "STIMA APR" = calcolo indicativo basato su stake, APR netto inserito e tempo trascorso, se il campione notturno non è disponibile.
- "N/D" = nessuna baseline affidabile e APR non configurato. Non vengono inventati valori.
- "CACHE" = uno o più dati non aggiornati; può mostrare l'ultimo valore disponibile, non un prezzo live.

Aggiornamento: Scriptable chiede un refresh dopo 15 minuti, ma iOS decide la frequenza effettiva. Un widget Scriptable NON invia notifiche push automatiche a un'ora esatta quando l'app è chiusa. Per notifiche mattutine garantite serve un sistema separato.

Mai incollare chiavi private, seed phrase o password. Solo indirizzi pubblici inj1.

SCHERMATA DI BLOCCO (iOS)
- La nuova versione ottimizza il widget rettangolare sotto l'orologio, con prezzo più grande, variazione dalle 23:00 e reward leggibili.
- In Scriptable scegli "Anteprima blocco schermo" per una simulazione (iOS può renderla diversamente a seconda dello sfondo).
- Per applicare la modifica su iPhone, SOSTITUISCI il vecchio codice dello script INJ Node con quello aggiornato dal repository. I wallet già salvati localmente restano configurati.
- Lo spazio dei widget nella schermata di blocco è fissato da iOS. Per una vista fisicamente più grande, usa il widget medio/grande sulla Home.

AGGIORNAMENTO VELOCE (v1.2)
- Il widget chiede a iOS un aggiornamento non prima di 1 minuto. È SOLO una richiesta: iOS decide quando consentirlo, spesso molto meno frequentemente (circa 15-60 minuti).
- Le chiamate API hanno timeout ridotto a 5 secondi e fino a cinque wallet vengono letti in parallelo per accelerare l'elaborazione.
- Tocca il widget per avviare lo script e visualizzare una nuova anteprima con i dati aggiornati (può essere necessario sbloccare l'iPhone). Questo non obbliga iOS a ridisegnare subito il widget nella schermata di blocco.
- Sulla schermata di blocco viene mostrato anche l'orario di acquisizione del prezzo; se è in cache, l'orario resta quello dell'ultima acquisizione reale.
- Per applicare la versione, sostituisci il codice esistente in Scriptable; gli indirizzi già inseriti rimangono nella configurazione locale.


DUE WIDGET SEPARATI SULLA SCHERMATA DI BLOCCO (v1.3)
1. Apri lo script INJ Node in Scriptable e sostituisci il codice con la nuova versione.
2. Tocca Play in Scriptable per vedere "Anteprima PREZZO (blocco)" oppure "Anteprima 24H + REWARD (blocco)".
3. Su iPhone tieni premuta la schermata di blocco > Personalizza > Schermata di blocco.
4. Nell'area widget sotto l'orologio, aggiungi Scriptable (formato RETTANGOLARE) DUE VOLTE.
5. Tocca il PRIMO widget Scriptable e seleziona:
   Script: INJ Node
   Parameter/Parametro: PRICE
6. Tocca il SECONDO widget Scriptable e seleziona:
   Script: INJ Node
   Parameter/Parametro: STATS
7. Conferma la schermata di blocco.

I due widget sono indipendenti: PRICE mostra solo il prezzo INJ/USD e l'orario dell'ultimo aggiornamento; STATS mostra l'effettiva variazione rolling 24 ore (non da mezzanotte o dalle 23) e la somma dei reward non riscossi dei wallet configurati.
Opzionale: nel widget STATS, scrivi STATS:1 per visualizzare soltanto i reward del primo wallet, STATS:2 per il secondo e così via.
Le configurazioni degli indirizzi e della valuta sono condivise tra i due widget. Gli indirizzi locali già configurati non vanno reinseriti.

Aggiornamento: entrambi richiedono il primo refresh disponibile dopo 1 minuto, ma Apple decide quando aggiornarli effettivamente; non è un flusso real-time. Il prezzo viene letto separatamente dal wallet e può aggiornarsi in momenti diversi. Se una fonte non risponde, il widget mostra CACHE quando utilizza valori precedenti.
