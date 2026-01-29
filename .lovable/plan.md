
## Migliorare la UI di Conferma Eliminazione Post

### Problema Attuale
Il sistema attualmente usa il dialog nativo del browser `confirm()` che appare come un popup generico del sistema operativo - non integrato con lo stile dell'app.

### Soluzione
Sostituire il `confirm()` nativo con un AlertDialog stilizzato di Radix UI, con traduzioni complete in tutte le lingue supportate.

---

### Modifiche Tecniche

#### 1. PostsGrid.tsx - Aggiungere stato e AlertDialog

**Aggiungere import:**
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

**Aggiungere stato per tracciare il post da eliminare:**
```tsx
const [postToDelete, setPostToDelete] = useState<string | null>(null);
```

**Modificare handleDeletePost (riga 162-189):**
```tsx
const handleDeletePost = (postId: string, event: React.MouseEvent) => {
  event.stopPropagation();
  setPostToDelete(postId); // Apre il dialog invece di confirm()
};

const confirmDelete = async () => {
  if (!postToDelete) return;
  
  try {
    const result = await deletePost(postToDelete);
    
    if (result.success) {
      toast.success(t('postDeletedSuccess', { ns: 'business' }));
      const { queryClient } = await import('@/lib/queryClient');
      queryClient.invalidateQueries({ queryKey: ['posts', targetUserId] });
    } else {
      toast.error(result.error?.message || t('failedDeletePost', { ns: 'business' }));
    }
  } catch (error) {
    toast.error(t('failedDeletePost', { ns: 'business' }));
  } finally {
    setPostToDelete(null);
  }
};
```

**Aggiungere AlertDialog nel JSX (prima del return finale):**
```tsx
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
        {deleting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {t('delete', { ns: 'common' })}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

#### 2. i18n.ts - Aggiungere traduzioni per il titolo

Aggiungere `deletePostTitle` al namespace `business` per tutte le lingue:

| Lingua | Chiave | Valore |
|--------|--------|--------|
| EN | deletePostTitle | Delete Post |
| ES | deletePostTitle | Eliminar Publicación |
| IT | deletePostTitle | Elimina Post |
| FR | deletePostTitle | Supprimer la Publication |
| DE | deletePostTitle | Beitrag Löschen |
| TR | deletePostTitle | Gönderiyi Sil |

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/profile/PostsGrid.tsx` | Sostituire `confirm()` con AlertDialog stilizzato |
| `src/i18n.ts` | Aggiungere `deletePostTitle` per tutte le lingue |

---

### Risultato Visivo

Il nuovo dialog avrà:
- Sfondo blur scuro semi-trasparente
- Card bianca con bordi arrotondati (rounded-2xl)
- Titolo "Elimina Post" in grassetto
- Messaggio di conferma tradotto
- Due pulsanti affiancati:
  - "Annulla" (outline) - chiude il dialog
  - "Elimina" (rosso destructive) - conferma l'eliminazione con spinner durante il caricamento
