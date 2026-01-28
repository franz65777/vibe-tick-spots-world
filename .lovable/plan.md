
## Obiettivo

Migliorare l'anteprima di risposta nella sezione messaggi con:
1. **Testo dinamico** basato sul tipo di contenuto: "a un luogo", "a un post", "a un profilo", ecc. invece del generico "Contenuto condiviso"
2. **Miniatura del contenuto** - piccola immagine di anteprima (come nello screenshot Instagram di riferimento)

---

## Analisi Attuale

Il codice attuale in `MessagesPage.tsx` (linee 1024-1044) mostra:
```tsx
<p className="text-sm text-foreground truncate">
  {replyingToMessage.content || t('sharedContent', { ns: 'messages' })}
</p>
```

Quando `replyingToMessage.content` è vuoto (es. per place_share, post_share), viene mostrato il fallback "Contenuto condiviso".

**Dati disponibili in `replyingToMessage`:**
- `message_type`: 'text' | 'place_share' | 'post_share' | 'profile_share' | 'story_share' | 'folder_share' | 'trip_share' | 'audio' | 'story_reply'
- `shared_content`: contiene i dati specifici (es. nome luogo, URL immagine post, avatar profilo)

---

## Piano di Implementazione

### Fase 1: Aggiungere chiavi di traduzione per i tipi di contenuto

Nel namespace `messages` di tutte le 12 lingue, aggiungere:

| Chiave | EN | IT |
|--------|----|----|
| `toAPlace` | to a place | a un luogo |
| `toAPost` | to a post | a un post |
| `toAProfile` | to a profile | a un profilo |
| `toAStory` | to a story | a una storia |
| `toAFolder` | to a list | a una lista |
| `toATrip` | to a trip | a un viaggio |
| `toAnAudio` | to an audio message | a un audio |

**File:** `src/i18n.ts`

### Fase 2: Creare funzione helper per estrarre thumbnail

Creare una funzione che estrae l'URL della miniatura dal `shared_content` in base al `message_type`:

```typescript
const getReplyThumbnail = (message: DirectMessage): string | null => {
  const content = message.shared_content;
  if (!content) return null;
  
  switch (message.message_type) {
    case 'place_share':
      return content.image_url || content.image || extractFirstPhotoUrl(content.photos);
    case 'post_share':
      return content.media_urls?.[0];
    case 'profile_share':
      return content.avatar_url;
    case 'story_share':
    case 'story_reply':
      return content.media_url;
    case 'folder_share':
      return content.cover_image;
    case 'trip_share':
      return content.cover_image;
    default:
      return null;
  }
};
```

### Fase 3: Creare funzione helper per testo dinamico

```typescript
const getReplyContentLabel = (message: DirectMessage, t: TFunction): string => {
  if (message.content) return message.content;
  
  switch (message.message_type) {
    case 'place_share':
      return t('toAPlace', { ns: 'messages' });
    case 'post_share':
      return t('toAPost', { ns: 'messages' });
    case 'profile_share':
      return t('toAProfile', { ns: 'messages' });
    case 'story_share':
    case 'story_reply':
      return t('toAStory', { ns: 'messages' });
    case 'folder_share':
      return t('toAFolder', { ns: 'messages' });
    case 'trip_share':
      return t('toATrip', { ns: 'messages' });
    case 'audio':
      return t('toAnAudio', { ns: 'messages' });
    default:
      return t('sharedContent', { ns: 'messages' });
  }
};
```

### Fase 4: Aggiornare UI Reply Preview

Modificare la sezione "Reply Preview" in `MessagesPage.tsx` (linee 1024-1044):

**Layout attuale:**
```
[Testo: "Stai rispondendo a X"]
[Testo: "Contenuto condiviso"]           [X]
```

**Nuovo layout (come Instagram):**
```
[Testo: "Stai rispondendo a X"]
[Testo dinamico: "a un luogo"]     [Miniatura 40x40]  [X]
```

```tsx
{/* Reply Preview */}
{replyingToMessage && (
  <div className="shrink-0 border-t border-border bg-accent/30 px-4 py-2 flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">
        {replyingToMessage.sender_id === user?.id 
          ? t('replyingToYourself', { ns: 'messages' }) 
          : t('replyingTo', { ns: 'messages', name: otherUserProfile?.username })}
      </p>
      <p className="text-sm text-foreground truncate">
        {getReplyContentLabel(replyingToMessage, t)}
      </p>
    </div>
    
    {/* Thumbnail */}
    {getReplyThumbnail(replyingToMessage) && (
      <img 
        src={getReplyThumbnail(replyingToMessage)!} 
        alt="Preview" 
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
      />
    )}
    
    <button 
      onClick={() => setReplyingToMessage(null)}
      className="p-1 hover:bg-accent rounded-full transition-colors flex-shrink-0"
    >
      <X className="w-5 h-5 text-muted-foreground" />
    </button>
  </div>
)}
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/i18n.ts` | Aggiungere 7 nuove chiavi in tutte le 12 lingue |
| `src/pages/MessagesPage.tsx` | Aggiungere helper functions + aggiornare Reply Preview UI |

---

## Traduzioni per tutte le 12 lingue

| Lingua | toAPlace | toAPost | toAProfile | toAStory | toAFolder | toATrip | toAnAudio |
|--------|----------|---------|------------|----------|-----------|---------|-----------|
| EN | to a place | to a post | to a profile | to a story | to a list | to a trip | to an audio |
| IT | a un luogo | a un post | a un profilo | a una storia | a una lista | a un viaggio | a un audio |
| ES | a un lugar | a una publicación | a un perfil | a una historia | a una lista | a un viaje | a un audio |
| FR | à un lieu | à un post | à un profil | à une story | à une liste | à un voyage | à un audio |
| DE | zu einem Ort | zu einem Beitrag | zu einem Profil | zu einer Story | zu einer Liste | zu einer Reise | zu einer Sprachnachricht |
| PT | a um lugar | a uma publicação | a um perfil | a uma história | a uma lista | a uma viagem | a um áudio |
| ZH | 回复地点 | 回复帖子 | 回复个人资料 | 回复故事 | 回复列表 | 回复旅程 | 回复语音 |
| JA | 場所へ | 投稿へ | プロフィールへ | ストーリーへ | リストへ | 旅行へ | 音声へ |
| KO | 장소에 | 게시물에 | 프로필에 | 스토리에 | 리스트에 | 여행에 | 오디오에 |
| AR | إلى مكان | إلى منشور | إلى ملف شخصي | إلى قصة | إلى قائمة | إلى رحلة | إلى رسالة صوتية |
| HI | एक स्थान पर | एक पोस्ट पर | एक प्रोफ़ाइल पर | एक स्टोरी पर | एक सूची पर | एक यात्रा पर | एक ऑडियो पर |
| RU | к месту | к публикации | к профилю | к истории | к списку | к путешествию | к аудио |

---

## Risultato Atteso

Prima:
```
Stai rispondendo a sartoriz
Contenuto condiviso                              [X]
```

Dopo:
```
Stai rispondendo a Riccardo Scaglione
a un luogo                           [📷 40x40]  [X]
```

L'anteprima ora mostra:
- Il tipo di contenuto tradotto dinamicamente
- Una miniatura del contenuto (immagine luogo, foto post, avatar profilo, ecc.)
- Layout simile a Instagram/iMessage
