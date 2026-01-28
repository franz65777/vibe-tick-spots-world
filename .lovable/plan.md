
## Obiettivo

Risolvere tre problemi nella sezione messaggi:
1. **Traduzione categorie** ancora in inglese (es. "Park" invece di "Parco")
2. **Testo "Replying to..."** fisso in inglese - deve essere tradotto (es. "Stai rispondendo a sartoriz")
3. **Visualizzazione risposta**: dopo aver risposto, mostrare "Hai risposto" sopra il messaggio originale con effetto fade

---

## Analisi Root-Cause

### Problema 1: Categorie in inglese
Le modifiche precedenti a `i18n.ts` sono corrette (supportedLngs, nonExplicitSupportedLngs, load: 'languageOnly'), ma il problema persiste perché:
- Il `LanguageDetector` potrebbe inizializzare i18n con `it-IT` prima che `App.tsx` normalizzi a `it`
- Il cambio lingua in `App.tsx` avviene DOPO che i18n è già inizializzato
- Soluzione: forzare la normalizzazione del codice lingua nella funzione di lookup del detector stesso

### Problema 2: Testo "Replying to" fisso in inglese
Le chiavi di traduzione usate nel codice (`replyingTo`, `replyingToYourself`, `typeReply`, `sharedContent`) **non esistono** nel namespace `messages` di `i18n.ts`. Il codice usa `defaultValue` in inglese come fallback.

### Problema 3: Manca visualizzazione "Hai risposto"
Attualmente quando si invia una risposta, non viene mostrato nessun indicatore visivo nella lista messaggi. Serve mostrare:
- "Hai risposto" (o "X ha risposto") sopra il messaggio
- Il messaggio originale a cui si è risposto con effetto fade

---

## Piano di Implementazione

### Fase 1: Aggiungere chiavi di traduzione mancanti in `i18n.ts`

Nel namespace `messages` di ogni lingua, aggiungere:

**Inglese (en):**
- `replyingTo: 'Replying to {{name}}'`
- `replyingToYourself: 'Replying to yourself'`
- `typeReply: 'Type a reply...'`
- `sharedContent: 'Shared content'`
- `youReplied: 'You replied'`
- `theyReplied: '{{name}} replied'`
- `reply: 'Reply'`
- `delete: 'Delete'`

**Italiano (it):**
- `replyingTo: 'Stai rispondendo a {{name}}'`
- `replyingToYourself: 'Stai rispondendo a te stesso'`
- `typeReply: 'Scrivi una risposta...'`
- `sharedContent: 'Contenuto condiviso'`
- `youReplied: 'Hai risposto'`
- `theyReplied: '{{name}} ha risposto'`
- `reply: 'Rispondi'`
- `delete: 'Elimina'`

Stesso pattern per le altre 10 lingue (es, fr, de, pt, zh-CN, ja, ko, ar, hi, ru).

### Fase 2: Correggere normalizzazione lingua in `i18n.ts`

Modificare la configurazione del LanguageDetector per normalizzare i codici lingua direttamente nel lookup:

```typescript
detection: {
  order: ['localStorage', 'navigator'],
  caches: ['localStorage'],
  lookupLocalStorage: 'i18nextLng',
  convertDetectedLanguage: (lng) => {
    // Normalizza it-IT → it, en-US → en, ma mantieni zh-CN
    if (lng.startsWith('zh')) return 'zh-CN';
    if (lng.includes('-') || lng.includes('_')) {
      return lng.split('-')[0].split('_')[0].toLowerCase();
    }
    return lng.toLowerCase();
  }
}
```

### Fase 3: Supporto risposte nel database

Il database `direct_messages` non ha attualmente un campo per tracciare a quale messaggio si sta rispondendo. Dovremo:

**Opzione A (consigliata)**: Usare il campo esistente `shared_content` per memorizzare il messaggio citato quando `message_type = 'text'` e c'è una risposta.

Quando si invia una risposta:
```typescript
{
  message_type: 'text',
  content: 'Nuovo messaggio',
  shared_content: {
    reply_to_id: 'uuid-del-messaggio-originale',
    reply_to_content: 'Testo del messaggio originale',
    reply_to_sender_id: 'uuid-del-mittente'
  }
}
```

### Fase 4: Modificare `messageService.ts`

Aggiornare `sendTextMessage` per accettare un parametro opzionale `replyToMessage`:

```typescript
async sendTextMessage(
  receiverId: string, 
  content: string, 
  replyToMessage?: DirectMessage
): Promise<DirectMessage | null>
```

Se `replyToMessage` è presente, popolare `shared_content` con i dati della risposta.

### Fase 5: Modificare `MessagesPage.tsx`

1. **Aggiornare `handleSendMessage`** per passare `replyingToMessage` a `sendTextMessage`
2. **Rimuovere defaultValue** dalle chiamate `t()` ora che le chiavi esistono
3. **Tradurre il menu azioni** (Reply → Rispondi, Delete → Elimina)

### Fase 6: Modificare `VirtualizedMessageList.tsx` per mostrare risposte

Nel `MessageBubble` component, aggiungere logica per renderizzare il contesto della risposta:

```tsx
{message.shared_content?.reply_to_id && (
  <div className="mb-2">
    <p className="text-xs text-muted-foreground">
      {isOwn 
        ? t('youReplied', { ns: 'messages' }) 
        : t('theyReplied', { ns: 'messages', name: otherUserProfile?.username })}
    </p>
    <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm opacity-60">
      {message.shared_content.reply_to_content}
    </div>
  </div>
)}
```

### Fase 7: Aggiungere effetto fade al messaggio citato

Applicare stile CSS con gradiente o opacità ridotta al messaggio originale citato:

```css
.reply-context {
  opacity: 0.6;
  background: linear-gradient(to bottom, var(--muted) 0%, transparent 100%);
}
```

---

## Struttura file da modificare

| File | Modifica |
|------|----------|
| `src/i18n.ts` | Aggiungere chiavi traduzione mancanti + convertDetectedLanguage |
| `src/services/messageService.ts` | Supporto parametro replyToMessage in sendTextMessage |
| `src/pages/MessagesPage.tsx` | Passare reply context, rimuovere defaultValue |
| `src/components/messages/VirtualizedMessageList.tsx` | Renderizzare contesto risposta con fade |
| `src/components/messages/MessageOptionsOverlay.tsx` | Tradurre etichette menu (Reply/Delete) |

---

## Riepilogo tecnico

1. **12 lingue** da aggiornare con 8 nuove chiavi nel namespace `messages`
2. **Nessuna migrazione database** richiesta - usiamo `shared_content` esistente
3. **Retrocompatibile** - messaggi esistenti continuano a funzionare
4. **Effetto visivo** come Instagram/iMessage per le risposte
