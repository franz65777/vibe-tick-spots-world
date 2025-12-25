// Normalizza etichette/categorie in una delle categorie base usate dall'app
// (serve per contatori e filtri coerenti tra saved_places e locations)

export type BaseCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'hotel'
  | 'museum'
  | 'entertainment'
  | 'bakery';

export function normalizeCategoryToBase(category: unknown): BaseCategory | null {
  const c = String(category ?? '').trim().toLowerCase();
  if (!c) return null;

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

  // bar
  if (
    c === 'bar' ||
    c === 'bars' ||
    c === 'pub' ||
    c === 'bar & pub' ||
    c === 'nightlife' ||
    c === 'club' ||
    c === 'nightclub' ||
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

  // entertainment
  if (
    c === 'entertainment' ||
    c === 'cinema' ||
    c === 'theatre' ||
    c === 'theater' ||
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
