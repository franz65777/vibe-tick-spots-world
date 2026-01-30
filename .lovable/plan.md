
## Piano di Miglioramento UX: Pagina Modifica Lista

### Problemi Identificati
1. **Spazio ristretto per selezionare i luoghi** - La lista dei luoghi ha un'altezza massima di 72 (288px) che limita la visibilità
2. **Footer occupa troppo spazio** - Il container con padding `p-4` copre parte importante della selezione luoghi
3. **Sezione superiore sempre visibile** - Quando l'utente sta selezionando luoghi, l'header e i form fields occupano spazio prezioso

### Soluzione Proposta: iOS-style Collapsible Header

Implementare un header e form che si nascondono automaticamente quando l'utente scorre verso il basso nella lista dei luoghi, massimizzando lo spazio disponibile per la selezione. Quando scorre verso l'alto, tutto riappare.

---

### Modifiche Tecniche

#### 1. Riorganizzazione Layout (CreateListPage.tsx)

**Struttura Attuale:**
- Header fisso + ScrollArea contenente tutto il form + Footer fisso

**Nuova Struttura:**
- Header con animazione hide/show
- Sezione form collapsible (nome lista, cover, privacy) con animazione
- Lista luoghi con scroll indipendente che occupa tutto lo spazio disponibile
- Footer compatto con bottoni

#### 2. Implementazione iOS-style Hiding

Utilizzo del hook esistente `useScrollHide` per:
- Nascondere header + form quando si scorre verso il basso nella lista luoghi
- Mostrare tutto quando si scorre verso l'alto
- Transizioni smooth con `transform` e `transition`

**Codice chiave:**
```tsx
const { hidden, setScrollContainer } = useScrollHide({ threshold: 30, enabled: true });

// Header + Form con transizione
<div className={`transition-all duration-300 ${
  hidden ? '-translate-y-full opacity-0 h-0 overflow-hidden' : 'translate-y-0 opacity-100'
}`}>
  {/* Header e form fields */}
</div>

// Lista luoghi con ref per tracking scroll
<div 
  ref={(el) => setScrollContainer(el)} 
  className="flex-1 overflow-y-auto"
>
  {/* Lista luoghi scrollabile */}
</div>
```

#### 3. Riduzione Footer

- Ridurre padding da `p-4` a `p-3`
- Eliminare `pb-safe` eccessivo, usare padding minimo
- Bottoni più compatti: `h-11` invece di `h-12`

```tsx
<div className="p-3 flex gap-3">
  {/* Bottoni */}
</div>
```

#### 4. Rimozione Limite Altezza Lista

- Eliminare `max-h-72` dalla lista luoghi
- La lista ora occupa tutto lo spazio disponibile grazie a flexbox

#### 5. UI Miglioramenti Aggiuntivi

**Indicatore di Contesto Compatto:**
Quando header/form sono nascosti, mostrare una mini-barra in alto con:
- Conteggio luoghi selezionati
- Tocca per scorrere in alto

**Transizioni Fluide:**
- `transform: translateY()` per GPU acceleration
- `transition-all duration-300 ease-out` per smoothness
- Nessun reflow durante animazioni

---

### Riepilogo Modifiche

| Elemento | Prima | Dopo |
|----------|-------|------|
| Lista luoghi | `max-h-72` (288px) | `flex-1` (tutto lo spazio) |
| Header/Form | Sempre visibile | Nascosto durante scroll down |
| Footer padding | `p-4 pb-safe` | `p-3` compatto |
| Bottoni | `h-12` | `h-11` |

---

### File da Modificare

**`src/pages/CreateListPage.tsx`:**
- Import `useScrollHide` hook
- Separare header+form dalla lista luoghi
- Applicare hiding animato a header+form
- Rimuovere max-h-72 dalla lista
- Ridurre padding footer
- Opzionale: aggiungere mini-indicatore quando form nascosto

---

### Risultato Atteso

- +150% spazio visibile per la selezione luoghi quando si scorre
- UX iOS-native con elementi che si nascondono fluidamente
- Footer più compatto che non copre la lista
- Transizioni GPU-accelerate a 60fps
- L'utente può facilmente rivedere i campi form scorrendo verso l'alto
