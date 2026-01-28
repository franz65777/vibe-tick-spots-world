
# Piano: Pulsante Minimizza Lista + Tasto Save/Condividi Dinamico

## Panoramica

Due miglioramenti UX richiesti:
1. **Minimizzare la sezione "aggiungi a una lista"** per dare risalto alla parte superiore (foto, descrizione, valutazione)
2. **Tasto dinamico Save → Condividi** quando l'utente contribuisce contenuti pubblici (foto, descrizione, valutazione)

---

## Logica del Tasto Dinamico

| Azione Utente | Tipo Contenuto | Tasto |
|---------------|----------------|-------|
| Solo salva in liste | Privato | **Salva** |
| Carica foto | Pubblico (review) | **Condividi** |
| Aggiunge descrizione | Pubblico (review) | **Condividi** |
| Valuta il posto | Pubblico (review) | **Condividi** |
| Combinazione dei precedenti | Pubblico | **Condividi** |

---

## Modifiche Tecniche

### 1. Nuovo Stato per Collasso Lista

```tsx
const [isListSectionCollapsed, setIsListSectionCollapsed] = useState(false);
```

### 2. Header Sezione Lista con Pulsante Minimizza

Aggiungere un'icona ChevronDown/ChevronUp che collassa la sezione:

```tsx
<div className="flex items-center justify-between mb-3">
  <button 
    onClick={() => setIsListSectionCollapsed(!isListSectionCollapsed)}
    className="flex items-center gap-2"
  >
    <span className="text-sm font-medium text-muted-foreground">
      {t('addToList', ...)}
    </span>
    <ChevronDown className={cn(
      "w-4 h-4 transition-transform",
      isListSectionCollapsed && "rotate-180"
    )} />
  </button>
  {/* Create list button */}
</div>

{/* Contenuto collassabile */}
{!isListSectionCollapsed && (
  <div className="space-y-3">
    {/* Folders list */}
  </div>
)}
```

### 3. Logica Tasto Dinamico

```tsx
// Determina se l'utente sta condividendo contenuti pubblici
const isSharing = selectedPhotos.length > 0 || 
                  descriptionText.trim().length > 0 || 
                  rating !== undefined;

// Nel bottone:
{isSharing 
  ? t('share', { ns: 'common', defaultValue: 'share' })
  : t('save', { ns: 'common', defaultValue: 'save' })
}
```

### 4. Nuove Traduzioni per "share"

Aggiungere la chiave `share` in `src/i18n-contribution.ts` per tutte le 13 lingue:

| Lingua | Traduzione |
|--------|------------|
| en | share |
| it | condividi |
| es | compartir |
| pt | compartilhar |
| fr | partager |
| de | teilen |
| ja | シェア |
| ko | 공유 |
| ar | مشاركة |
| hi | साझा करें |
| ru | поделиться |
| zh-CN | 分享 |
| tr | paylaş |

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/explore/LocationContributionModal.tsx` | Aggiungere stato collasso, pulsante minimize, logica tasto dinamico |
| `src/i18n-contribution.ts` | Aggiungere chiave `share` in tutte le 13 lingue |

---

## Dettaglio UI

### Sezione Lista Collassata
Quando minimizzata:
- Mostra solo l'header con "aggiungi a una lista" e icona chevron su
- Nasconde la lista delle cartelle
- L'utente può riaprire cliccando sull'header

### Tasto Save/Condividi
- **Stile invariato** (stesso colore, dimensione)
- **Testo cambia dinamicamente** in base al contenuto
- Il cambio avviene in tempo reale mentre l'utente interagisce

---

## Risultato Atteso

1. **Sezione liste minimizzabile**: L'utente può collassare la sezione per concentrarsi su foto/descrizione/valutazione
2. **Feedback visivo chiaro**: Il tasto "Condividi" comunica che il contenuto sarà pubblico
3. **Localizzazione completa**: Tutte le 13 lingue supportate per la nuova chiave "share"
