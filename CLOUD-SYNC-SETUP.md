# INJ Node · Cloud Sync personale (modalità B)

L'interfaccia è dentro INJ Node → **Menu → Preferenze → Cloud Sync**. Backend isolato nella repository privata [INJ-NODE-INSIGHTS/cloud-sync](https://github.com/ivanbarbacini95-collab/INJ-NODE-INSIGHTS/tree/main/cloud-sync).

## Cloudflare: crea un servizio diverso da Admin Insights

1. In Cloudflare apri Workers & Pages → Create application, collega GitHub e seleziona `ivanbarbacini95-collab/INJ-NODE-INSIGHTS`.
2. Imposta **Root directory `cloud-sync`**, Deploy command `npx wrangler deploy` e nome Worker `inj-node-cloud-sync`.
3. Crea un **nuovo D1** chiamato `inj-node-cloud-sync`. Non usare `inj-node-insights`: è il database dell'analisi accessi.
4. Riporta il nuovo **Database ID**, che non è una password, in `cloud-sync/wrangler.toml`, aggiungendo:

```toml
[[d1_databases]]
binding = "DB"
database_name = "inj-node-cloud-sync"
database_id = "NUOVO_UUID_D1"
```

5. In **Settings → Variables and Secrets** per il Worker personale aggiungi due Secret distinti e casuali di almeno 32 caratteri:
   `SYNC_SESSION_SECRET` e `SYNC_DATA_SECRET`. Conserva una copia sicura di **SYNC_DATA_SECRET**; se lo perdi, non sarà più possibile decifrare i backup esistenti.
6. Controlla **l'URL vero** del Worker, ad esempio `https://inj-node-cloud-sync.TUO_ACCOUNT.workers.dev/health`, finché ritorna `databaseConnected:true` e `configured:true`. Nessun URL è inventato o preconfigurato.
7. Inserisci **solo l'URL pubblico** nel file `cloud-sync-config.js`:

```js
window.INJ_CLOUD_SYNC_URL = 'https://IL-VERO-WORKER.workers.dev';
```

Non inserire username, password, bearer token né segreti in GitHub o nell'app.

## Sicurezza e gestione account

- **Passkey**: il Worker verifica crittograficamente registrazioni e accessi WebAuthn; il browser invia solo attestazioni/firme, mai la chiave privata.
- **Dominio**: una passkey è legata al dominio di INJ Node. Scegli **il dominio definitivo** prima di creare account: le credenziali create su GitHub Pages non funzionano automaticamente su un dominio Vercel differente. `www.injectiveportfolio.com` e `injectiveportfolio.com` condividono l'RP ID `injectiveportfolio.com`.
- **Account**: non richiede email, ma necessita di una passkey recuperabile. Registra almeno due passkey oppure assicurati che il provider sincronizzi la passkey tra dispositivi; se perdi tutte le passkey senza backup, potresti perdere accesso ai dati.
- **Backup**: il primo salvataggio deve essere avviato dall'utente. Un dispositivo nuovo non può partire sovrascrivendo il backup cloud. I successivi backup automatici richiedono attivazione esplicita e verificano il numero di versione.
- **Crittografia**: snapshot cifrati **sul server** con AES-GCM prima di entrare in D1; non è cifratura end-to-end, perché il Worker detiene la chiave di cifratura.
- **Dati inclusi (prima versione)**: indirizzi wallet **pubblici** e nomi, prezzo medio, valuta, lingua, tema, privacy, preferiti crypto e Workspace/preset selezionati. Cache di mercato, sessioni analytics, chiavi private, seed phrase e altre informazioni non autorizzate sono escluse.
- **Dispositivi**: i dati locali continuano a funzionare senza Cloud Sync; il ripristino è un'azione esplicita e aggiorna INJ Node quando viene completato.
- **Privacy e produzione**: richiede informativa privacy accurata, rate limit/WAF sugli endpoint di registrazione/accesso, test reali passkey su Safari e desktop, verifica conflitti tra dispositivi e politica di backup del database.

## Stato della pubblicazione

**Codice GitHub pronto, ma non ancora pubblicato/configurato su Cloudflare.** Fino a quando `window.INJ_CLOUD_SYNC_URL` è vuoto, la funzionalità rimane disabilitata. Non vengono trasferiti nuovi dati personali.
