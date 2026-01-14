// Normalizza etichette/categorie in una delle categorie base usate dall'app
// (serve per contatori e filtri coerenti tra saved_places e locations)

export type BaseCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'hotel'
  | 'museum'
  | 'entertainment'
  | 'bakery'
  | 'park'
  | 'historical'
  | 'nightclub';

export function normalizeCategoryToBase(category: unknown): BaseCategory | null {
  const c = String(category ?? '').trim().toLowerCase();
  if (!c) return null;

  // nightclub - clubs and late-night dance venues
  if (
    c === 'nightclub' ||
    c === 'night_club' ||
    c === 'discotheque' ||
    c === 'disco' ||
    c.includes('nightclub')
  )
    return 'nightclub';

  // park - outdoor green spaces
  if (
    c === 'park' ||
    c === 'parks' ||
    c === 'garden' ||
    c === 'playground' ||
    c === 'nature_reserve' ||
    c === 'national_park' ||
    c.includes('park')
  )
    return 'park';

  // historical - landmarks, monuments, historical sites
  if (
    c === 'historical' ||
    c === 'landmark' ||
    c === 'monument' ||
    c === 'memorial' ||
    c === 'castle' ||
    c === 'ruins' ||
    c === 'archaeological_site' ||
    c === 'tourist_attraction' ||
    c === 'attraction' ||
    c.includes('historical') ||
    c.includes('landmark') ||
    c.includes('monument')
  )
    return 'historical';

  // restaurant
  if (
    c === 'restaurant' ||
    c === 'restaurants' ||
    c === 'food' ||
    c === 'dining' ||
    c.includes('restaurant')
  )
    return 'restaurant';

  // cafe
  if (
    c === 'cafe' ||
    c === 'café' ||
    c === 'cafè' ||
    c === 'coffee' ||
    c === 'coffee shop' ||
    c === 'coffee_shop' ||
    c.includes('cafe') ||
    c.includes('caff') ||
    c.includes('coffee')
  )
    return 'cafe';

  // bar (excluding nightclub which is handled above)
  if (
    c === 'bar' ||
    c === 'bars' ||
    c === 'pub' ||
    c === 'bar & pub' ||
    c.includes('bar') ||
    c.includes('pub')
  )
    return 'bar';

  // hotel
  if (
    c === 'hotel' ||
    c === 'accommodation' ||
    c === 'lodging' ||
    c.includes('hotel') ||
    c.includes('lodg') ||
    c.includes('accommod')
  )
    return 'hotel';

  // museum
  if (
    c === 'museum' ||
    c === 'gallery' ||
    c === 'cultural' ||
    c.includes('museum') ||
    c.includes('gallery')
  )
    return 'museum';

  // entertainment (excluding parks, nightclubs, historical which are handled above)
  if (
    c === 'entertainment' ||
    c === 'cinema' ||
    c === 'theatre' ||
    c === 'theater' ||
    c === 'arcade' ||
    c === 'bowling' ||
    c.includes('cinema') ||
    c.includes('theat')
  )
    return 'entertainment';

  // bakery
  if (
    c === 'bakery' ||
    c === 'patisserie' ||
    c === 'pastry' ||
    c.includes('bakery') ||
    c.includes('pasticc') ||
    c.includes('panett')
  )
    return 'bakery';

  return null;
}
