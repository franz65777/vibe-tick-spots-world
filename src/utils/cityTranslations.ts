// City name translations for common cities
export const cityTranslations: Record<string, Record<string, string>> = {
  // English cities (base names)
  'Dublin': {
    it: 'Dublino',
    es: 'Dublín',
    fr: 'Dublin',
    de: 'Dublin',
  },
  'Milan': {
    it: 'Milano',
    es: 'Milán',
    fr: 'Milan',
    de: 'Mailand',
  },
  'Rome': {
    it: 'Roma',
    es: 'Roma',
    fr: 'Rome',
    de: 'Rom',
  },
  'Florence': {
    it: 'Firenze',
    es: 'Florencia',
    fr: 'Florence',
    de: 'Florenz',
  },
  'Venice': {
    it: 'Venezia',
    es: 'Venecia',
    fr: 'Venise',
    de: 'Venedig',
  },
  'Turin': {
    it: 'Torino',
    es: 'Turín',
    fr: 'Turin',
    de: 'Turin',
  },
  'Naples': {
    it: 'Napoli',
    es: 'Nápoles',
    fr: 'Naples',
    de: 'Neapel',
  },
  'Genoa': {
    it: 'Genova',
    es: 'Génova',
    fr: 'Gênes',
    de: 'Genua',
  },
  'London': {
    it: 'Londra',
    es: 'Londres',
    fr: 'Londres',
    de: 'London',
  },
  'Paris': {
    it: 'Parigi',
    es: 'París',
    fr: 'Paris',
    de: 'Paris',
  },
  'Madrid': {
    it: 'Madrid',
    es: 'Madrid',
    fr: 'Madrid',
    de: 'Madrid',
  },
  'Barcelona': {
    it: 'Barcellona',
    es: 'Barcelona',
    fr: 'Barcelone',
    de: 'Barcelona',
  },
  'Berlin': {
    it: 'Berlino',
    es: 'Berlín',
    fr: 'Berlin',
    de: 'Berlin',
  },
  'Munich': {
    it: 'Monaco',
    es: 'Múnich',
    fr: 'Munich',
    de: 'München',
  },
  'Vienna': {
    it: 'Vienna',
    es: 'Viena',
    fr: 'Vienne',
    de: 'Wien',
  },
  'Athens': {
    it: 'Atene',
    es: 'Atenas',
    fr: 'Athènes',
    de: 'Athen',
  },
  'Lisbon': {
    it: 'Lisbona',
    es: 'Lisboa',
    fr: 'Lisbonne',
    de: 'Lissabon',
  },
  'Brussels': {
    it: 'Bruxelles',
    es: 'Bruselas',
    fr: 'Bruxelles',
    de: 'Brüssel',
  },
  'Amsterdam': {
    it: 'Amsterdam',
    es: 'Ámsterdam',
    fr: 'Amsterdam',
    de: 'Amsterdam',
  },
  'Copenhagen': {
    it: 'Copenaghen',
    es: 'Copenhague',
    fr: 'Copenhague',
    de: 'Kopenhagen',
  },
  'Stockholm': {
    it: 'Stoccolma',
    es: 'Estocolmo',
    fr: 'Stockholm',
    de: 'Stockholm',
  },
  'Moscow': {
    it: 'Mosca',
    es: 'Moscú',
    fr: 'Moscou',
    de: 'Moskau',
  },
  'Warsaw': {
    it: 'Varsavia',
    es: 'Varsovia',
    fr: 'Varsovie',
    de: 'Warschau',
  },
  'Prague': {
    it: 'Praga',
    es: 'Praga',
    fr: 'Prague',
    de: 'Prag',
  },
  'Budapest': {
    it: 'Budapest',
    es: 'Budapest',
    fr: 'Budapest',
    de: 'Budapest',
  },
  'New York': {
    it: 'New York',
    es: 'Nueva York',
    fr: 'New York',
    de: 'New York',
  },
  'Los Angeles': {
    it: 'Los Angeles',
    es: 'Los Ángeles',
    fr: 'Los Angeles',
    de: 'Los Angeles',
  },
  'Tokyo': {
    it: 'Tokyo',
    es: 'Tokio',
    fr: 'Tokyo',
    de: 'Tokio',
  },
  'Beijing': {
    it: 'Pechino',
    es: 'Pekín',
    fr: 'Pékin',
    de: 'Peking',
  },
  'Shanghai': {
    it: 'Shanghai',
    es: 'Shanghái',
    fr: 'Shanghai',
    de: 'Shanghai',
  },
  'Sydney': {
    it: 'Sydney',
    es: 'Sídney',
    fr: 'Sydney',
    de: 'Sydney',
  },
  'Cairo': {
    it: 'Il Cairo',
    es: 'El Cairo',
    fr: 'Le Caire',
    de: 'Kairo',
  },
  'Istanbul': {
    it: 'Istanbul',
    es: 'Estambul',
    fr: 'Istanbul',
    de: 'Istanbul',
  },
};

/**
 * Translates a city name to the specified language
 * @param cityName - The city name in English
 * @param language - The target language code (e.g., 'it', 'es', 'fr')
 * @returns The translated city name, or the original if no translation exists
 */
export function translateCityName(cityName: string, language: string): string {
  if (!cityName || language === 'en') return cityName;
  
  // Normalize the city name (remove extra spaces, capitalize properly)
  const normalizedCity = cityName.trim();
  
  // Check if we have a translation for this city
  const translations = cityTranslations[normalizedCity];
  if (translations && translations[language]) {
    return translations[language];
  }
  
  // Return original if no translation found
  return cityName;
}
