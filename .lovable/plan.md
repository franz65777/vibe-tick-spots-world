

## Correggere Layout e Stile del Dialog di Eliminazione Post

### Problemi Identificati dallo Screenshot

1. **Container fuori margini**: La combinazione di `w-full max-w-lg` nel componente base + `max-w-sm mx-4` aggiunto crea conflitti
2. **Bottoni disallineati verticalmente**: `AlertDialogFooter` usa `flex-col-reverse` su mobile
3. **Margine extra su "Annulla"**: `AlertDialogCancel` ha `mt-2` su mobile
4. **Bordo troppo spesso**: Il bottone "Annulla" ha un bordo outline troppo evidente

### Traduzioni
Le traduzioni esistono gia per tutte le lingue (EN, ES, IT, FR, DE, TR):
- `deletePostTitle`: "Elimina Post" (IT), "Delete Post" (EN), etc.
- `confirmDeletePost`: messaggio completo tradotto
- `cancel` e `delete`: gia nel namespace common

---

### Modifiche Tecniche

#### PostsGrid.tsx - Migliorare classi CSS del dialog

```tsx
// DA (riga 499-520)
<AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
  <AlertDialogContent className="rounded-2xl max-w-sm mx-4">
    <AlertDialogHeader>
      <AlertDialogTitle>{t('deletePostTitle', { ns: 'business' })}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('confirmDeletePost', { ns: 'business' })}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex-row gap-2">
      <AlertDialogCancel className="flex-1 rounded-xl">
        {t('cancel', { ns: 'common' })}
      </AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmDelete}
        className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90"
        disabled={deleting}
      >
        {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {t('delete', { ns: 'common' })}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// A
<AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
  <AlertDialogContent className="w-[calc(100%-32px)] max-w-[320px] rounded-2xl p-6">
    <AlertDialogHeader className="text-center">
      <AlertDialogTitle className="text-lg font-semibold">
        {t('deletePostTitle', { ns: 'business' })}
      </AlertDialogTitle>
      <AlertDialogDescription className="text-muted-foreground">
        {t('confirmDeletePost', { ns: 'business' })}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex flex-row gap-3 mt-2">
      <AlertDialogCancel className="flex-1 m-0 rounded-xl h-12 border-muted-foreground/30">
        {t('cancel', { ns: 'common' })}
      </AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmDelete}
        className="flex-1 m-0 rounded-xl h-12 bg-destructive hover:bg-destructive/90 text-white"
        disabled={deleting}
      >
        {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {t('delete', { ns: 'common' })}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Dettaglio Modifiche CSS

| Elemento | Prima | Dopo | Motivo |
|----------|-------|------|--------|
| `AlertDialogContent` | `max-w-sm mx-4` | `w-[calc(100%-32px)] max-w-[320px] p-6` | Calcolo preciso larghezza con margini |
| `AlertDialogHeader` | default | `text-center` | Centrare titolo e descrizione |
| `AlertDialogFooter` | `flex-row gap-2` | `flex flex-row gap-3 mt-2` | Forzare row layout sempre |
| `AlertDialogCancel` | `flex-1 rounded-xl` | `flex-1 m-0 rounded-xl h-12 border-muted-foreground/30` | Rimuovere mt-2, bordo piu sottile |
| `AlertDialogAction` | `flex-1 rounded-xl` | `flex-1 m-0 rounded-xl h-12` | Rimuovere margini, altezza uniforme |

---

### Risultato Atteso

```text
┌─────────────────────────────────────┐
│                                     │
│          Elimina Post               │  <- Titolo centrato
│                                     │
│  Sei sicuro di voler eliminare      │  <- Descrizione centrata
│  questo post? Questa azione non     │
│  puo essere annullata.              │
│                                     │
│  ┌───────────┐  ┌───────────┐       │
│  │  Annulla  │  │  Elimina  │       │  <- Bottoni allineati, stessa altezza
│  └───────────┘  └───────────┘       │
│                                     │
└─────────────────────────────────────┘
```

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/profile/PostsGrid.tsx` | Aggiornare classi CSS del dialog (righe 499-520) |

