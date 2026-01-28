
## Obiettivo
Far funzionare davvero la traduzione delle categorie (es. “Park” → “Parco”) in **/messages** sia:
- nella **Place card** dentro la chat
- nella **lista “Condividi luogo salvato”** (bottom sheet)

Dai tuoi input: la lingua in Settings è Italiano e “cambia tutto tranne le categorie”. Questo è un forte indizio che:
- la lingua reale di i18next potrebbe essere qualcosa tipo **it-IT** / **en-US** (o non “pulita”), quindi i18next fa fallback a EN per le chiavi senza `defaultValue`
- molte UI sembrano italiane perché in tanti punti usiamo `defaultValue` in italiano, mentre le categorie dipendono da chiavi reali (`common.categories.*`) e quindi restano in inglese quando il fallback scatta.

---

## 1) Correzione “root cause”: normalizzare e supportare i codici lingua (it-IT → it)
### Modifica in `src/i18n.ts`
Aggiorneremo la configurazione di i18next per gestire correttamente lingue “con regione”:

- aggiungere `supportedLngs` (l’elenco dei codici effettivamente presenti: `en, it, es, fr, de, pt, zh-CN, ja, ko, ar, hi, ru`)
- aggiungere `nonExplicitSupportedLngs: true` (così `it-IT` usa `it`)
- aggiungere `load: 'languageOnly'` e/o `cleanCode: true` (per tagliare la regione e pulire i codici)

Risultato: anche se per qualunque motivo arriva `it-IT`, i18next userà le risorse `it` e le categorie diventeranno “Parco, Ristorante, …”.

### Modifica in `src/pages/SettingsPage.tsx` (e punti simili)
L’attuale `normalizeLanguage` gestisce solo zh. La estenderemo per:
- trasformare `it-IT` → `it`, `en-US` → `en`, ecc.
- mantenere eccezioni come `zh-CN` correttamente

Così quando salvi e applichi la lingua, la apposta sempre in formato compatibile con le risorse.

### Modifica in `src/App.tsx`
L’effetto che carica la lingua da `profiles.language` fa `i18n.changeLanguage(lang)` senza `await`, e il `try/catch` non intercetta eventuali errori async.
Lo renderemo robusto:
- normalizzare `lang` prima di applicarlo
- `await i18n.changeLanguage(normalizedLang)`
- aggiornare `localStorage i18nextLng` con il valore normalizzato

Questo evita stati “a metà” dove la UI sembra in IT per i `defaultValue`, ma i18next rimane in EN per le chiavi reali.

---

## 2) Correzione “symptom”: traduzione categoria sempre normalizzata (Park / parks / Bar & Pub)
Anche risolvendo la lingua, nel bottom sheet di /messages oggi viene fatto:
```ts
t(`categories.${place.category}`, { ns: 'common', defaultValue: ... })
```
Se `place.category` è “Park” (capitalizzata), la chiave diventa `categories.Park` (non esiste).

### Modifica in `src/pages/MessagesPage.tsx`
Nella sezione “Saved Places Modal” sostituiremo la logica con la funzione già presente `translateCategory(...)` (che normalizza con `normalizeCategoryToBase` + lowercase fallback).
Obiettivo: sempre `categories.park` (lowercase e base-key coerente).

### Modifica in `src/components/messages/PlaceMessageCard.tsx`
Per ridurre difformità e casi limite, allineeremo anche qui la resa usando **lo stesso helper** `translateCategory(category, t)` invece di avere logica duplicata.
Risultato: stesso comportamento ovunque in /messages.

---

## 3) Verifica mirata (per confermare il fix)
Dopo le modifiche:
1) Vai in **Settings → Language → Italiano**
2) Torna in **/messages**
3) Controlla:
   - nella card condivisa: “Parco” invece di “Park”
   - nel bottom sheet “Condividi luogo salvato”: “Parco” invece di “Park”

Se ancora non cambia, aggiungeremo (temporaneamente) un piccolo debug visivo non invasivo (solo in dev) per stampare `i18n.resolvedLanguage` dentro /messages, così vediamo al 100% che lingua sta usando i18next.

---

## File coinvolti (previsti)
- `src/i18n.ts` (config i18next: supportedLngs / nonExplicitSupportedLngs / load languageOnly / cleanCode)
- `src/App.tsx` (apply language robusto: normalize + await changeLanguage)
- `src/pages/SettingsPage.tsx` (normalizeLanguage estesa)
- `src/pages/MessagesPage.tsx` (categoria nel Saved Places sheet via `translateCategory`)
- `src/components/messages/PlaceMessageCard.tsx` (categoria via `translateCategory` per coerenza)

---

## Note tecniche (perché succede “solo categorie”)
- Molti testi UI passano `defaultValue` (spesso in italiano). Quindi anche se i18next sta in EN, quei testi “sembrano” tradotti.
- Le categorie invece devono trovare davvero `common.categories.park` dentro la lingua corrente: se la lingua effettiva è `it-IT` e non è mappata, i18next fa fallback su EN → “Park”.

Questa patch sistema la radice (lingua) e anche le key (Park → park) nel punto critico /messages.
