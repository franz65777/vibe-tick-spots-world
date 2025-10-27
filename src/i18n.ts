import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Minimal initial resources. Add more languages over time.
const resources = {
  en: {
    common: {
      clearAll: 'Clear All',
      thisCity: 'this city',
    },
    navigation: {
      explore: 'Explore',
      search: 'Search',
      add: 'Add',
      feed: 'Feed',
      profile: 'Profile',
    },
    mapFilters: {
      following: 'Following',
      followingDesc: 'Places from people you follow',
      popular: 'Popular',
      popularDesc: 'Trending locations nearby',
      saved: 'Saved',
      savedDesc: 'Your saved places',
      searchPlaceholder: 'Search people you follow...',
      addAnother: 'Add another person',
      clearFilter: 'Clear filter',
      noUsersInCity: 'No followed users have saved places in {{city}}',
      showingPinsFrom: 'Showing pins from:',
    },
    categories: {
      restaurant: 'Restaurants',
      bar: 'Bars & Pubs',
      cafe: 'Cafés',
      bakery: 'Bakeries',
      hotel: 'Hotels',
      museum: 'Museums',
      entertainment: 'Entertainment',
    },
  },
  it: {
    common: {
      clearAll: 'Cancella tutto',
      thisCity: 'questa città',
    },
    navigation: {
      explore: 'Esplora',
      search: 'Cerca',
      add: 'Aggiungi',
      feed: 'Feed',
      profile: 'Profilo',
    },
    mapFilters: {
      following: 'Seguiti',
      followingDesc: 'Luoghi dalle persone che segui',
      popular: 'Popolari',
      popularDesc: 'Luoghi di tendenza nelle vicinanze',
      saved: 'Salvati',
      savedDesc: 'I tuoi luoghi salvati',
      searchPlaceholder: 'Cerca le persone che segui...',
      addAnother: 'Aggiungi un’altra persona',
      clearFilter: 'Pulisci filtro',
      noUsersInCity: 'Nessun utente seguito ha luoghi salvati in {{city}}',
      showingPinsFrom: 'Mostrando pin da:',
    },
    categories: {
      restaurant: 'Ristoranti',
      bar: 'Bar e Pub',
      cafe: 'Caffè',
      bakery: 'Panetterie',
      hotel: 'Hotel',
      museum: 'Musei',
      entertainment: 'Intrattenimento',
    },
  },
  es: {
    common: {
      clearAll: 'Borrar todo',
      thisCity: 'esta ciudad',
    },
    navigation: {
      explore: 'Explorar',
      search: 'Buscar',
      add: 'Añadir',
      feed: 'Feed',
      profile: 'Perfil',
    },
    mapFilters: {
      following: 'Siguiendo',
      followingDesc: 'Lugares de la gente que sigues',
      popular: 'Popular',
      popularDesc: 'Lugares en tendencia cercanos',
      saved: 'Guardados',
      savedDesc: 'Tus lugares guardados',
      searchPlaceholder: 'Busca personas que sigues...',
      addAnother: 'Añadir otra persona',
      clearFilter: 'Limpiar filtro',
      noUsersInCity: 'Nadie que sigues tiene lugares guardados en {{city}}',
      showingPinsFrom: 'Mostrando pines de:',
    },
    categories: {
      restaurant: 'Restaurantes',
      bar: 'Bares y Pubs',
      cafe: 'Cafés',
      bakery: 'Panaderías',
      hotel: 'Hoteles',
      museum: 'Museos',
      entertainment: 'Entretenimiento',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    // supportedLngs disabled to allow any BCP-47 language
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      // Allow querystring, localStorage, navigator, htmlTag
      order: ['localStorage', 'querystring', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in sync
const updateHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng || 'en';
  }
};
updateHtmlLang(i18n.language);
i18n.on('languageChanged', updateHtmlLang);

export default i18n;
