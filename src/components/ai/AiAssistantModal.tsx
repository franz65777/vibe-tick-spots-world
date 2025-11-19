import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { Sparkles, Send, MapPin, Compass, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LocationDetailDrawer from '@/components/home/LocationDetailDrawer';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';

const detectLanguage = (text: string): string => {
  const lowerText = text.toLowerCase();
  
  // Italian
  if (/\b(ciao|grazie|per favore|dove|come|quando|perch[eé]|cosa|dove|qui|là|molto|bene|male|sì|no|ho|hai|sono|sei|è|siamo|hanno)\b/.test(lowerText)) return 'Italian';
  
  // Spanish
  if (/\b(hola|gracias|por favor|dónde|cómo|cuándo|por qué|qué|aquí|allí|muy|bien|mal|sí|no|tengo|tienes|soy|eres|es|somos|tienen)\b/.test(lowerText)) return 'Spanish';
  
  // French
  if (/\b(bonjour|merci|s'il vous plaît|où|comment|quand|pourquoi|quoi|ici|là|très|bien|mal|oui|non|j'ai|tu as|je suis|tu es|il est|nous sommes|ils ont)\b/.test(lowerText)) return 'French';
  
  // German
  if (/\b(hallo|danke|bitte|wo|wie|wann|warum|was|hier|dort|sehr|gut|schlecht|ja|nein|ich habe|du hast|ich bin|du bist|er ist|wir sind|sie haben)\b/.test(lowerText)) return 'German';
  
  // Portuguese
  if (/\b(olá|obrigado|por favor|onde|como|quando|por que|o que|aqui|lá|muito|bem|mal|sim|não|tenho|tens|sou|és|é|somos|têm)\b/.test(lowerText)) return 'Portuguese';
  
  // Dutch
  if (/\b(hallo|dank je|alsjeblieft|waar|hoe|wanneer|waarom|wat|hier|daar|zeer|goed|slecht|ja|nee|ik heb|je hebt|ik ben|je bent|hij is|we zijn|ze hebben)\b/.test(lowerText)) return 'Dutch';
  
  // Russian
  if (/[а-яА-ЯёЁ]/.test(text)) return 'Russian';
  
  // Chinese
  if (/[\u4e00-\u9fa5]/.test(text)) return 'Chinese';
  
  // Japanese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'Japanese';
  
  // Korean
  if (/[\uac00-\ud7af]/.test(text)) return 'Korean';
  
  // Arabic
  if (/[\u0600-\u06ff]/.test(text)) return 'Arabic';
  
  // Default to English
  return 'English';
};

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal = ({ isOpen, onClose }: AiAssistantModalProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const { messages, isLoading, error, sendMessage } = useAiAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation('ai');
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage;
    const detectedLanguage = detectLanguage(message);
    setInputMessage('');
    await sendMessage(message, detectedLanguage);
  };

  const handleQuickAction = (prompt: string) => {
    const detectedLanguage = detectLanguage(prompt);
    sendMessage(prompt, detectedLanguage);
  };

  const handlePlaceClick = (name: string, placeId: string) => {
    if (placeId === 'unknown') return;
    
    const isInternal = placeId.startsWith('internal:');
    const actualId = isInternal ? placeId.replace('internal:', '') : placeId;

    setSelectedLocation({
      place_id: actualId,
      name,
      category: 'restaurant',
      city: null,
      coordinates: { lat: 0, lng: 0 }
    });
    setDrawerOpen(true);
  };

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  const parseContent = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const placeRegex = /\[PLACE:([^\|]+)\|([^\]]+)\]/g;
    const userRegex = /\[USER:([^\|]+)\|([^\]]+)\]/g;
    const combined = /\[(PLACE|USER):([^\|]+)\|([^\]]+)\]/g;
    
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = combined.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const type = match[1];
      const name = match[2];
      const id = match[3];

      if (type === 'PLACE' && id !== 'unknown') {
        parts.push(
          <button
            key={`place-${keyCounter++}`}
            onClick={() => handlePlaceClick(name, id)}
            className="text-primary underline decoration-primary/50 hover:decoration-primary transition-colors font-medium"
          >
            {name}
          </button>
        );
      } else if (type === 'USER') {
        parts.push(
          <button
            key={`user-${keyCounter++}`}
            onClick={() => handleUserClick(id)}
            className="text-primary underline decoration-primary/50 hover:decoration-primary transition-colors font-medium"
          >
            @{name}
          </button>
        );
      } else {
        parts.push(name);
      }

      lastIndex = combined.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const quickActions = [
    { icon: MapPin, labelKey: 'hiddenGems', prompt: t('hiddenGemsPrompt') },
    { icon: Compass, labelKey: 'planTrip', prompt: t('planTripPrompt') },
    { icon: Calendar, labelKey: 'itinerary', prompt: t('itineraryPrompt') },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col pt-[25px]">
      <style>{`
        [class*="bottom-navigation"],
        [class*="NewBottomNavigation"],
        [class*="BusinessBottomNavigation"],
        nav[class*="fixed bottom"] {
          display: none !important;
        }
      `}</style>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('title')}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-6 py-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{t('welcomeTitle')}</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {t('welcomeDesc')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.labelKey}
                    variant="outline"
                    className="h-auto flex-col gap-2 p-4"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isLoading}
                  >
                    <action.icon className="w-5 h-5" />
                    <span className="text-sm">{t(action.labelKey)}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <p className="text-sm whitespace-pre-wrap">
                        {parseContent(message.content)}
                      </p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t('inputPlaceholder')}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !inputMessage.trim()}
              className="rounded-2xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <LocationDetailDrawer
        location={selectedLocation}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedLocation(null);
        }}
      />
    </div>
  );
};
