
interface ImageCache {
  [key: string]: string;
}

class ImageService {
  private cache: ImageCache = {};
  private readonly UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // User needs to add this

  // Generate cache key for a place
  private getCacheKey(placeName: string, city: string, category: string): string {
    return `${placeName}_${city}_${category}`.toLowerCase().replace(/\s+/g, '_');
  }

  // Fetch image from Unsplash API
  private async fetchFromUnsplash(query: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`
          }
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].urls.regular;
      }
    } catch (error) {
      console.error('Error fetching from Unsplash:', error);
    }
    return null;
  }

  // Get place image with fallback chain
  async getPlaceImage(placeName: string, city: string, category: string): Promise<string> {
    const cacheKey = this.getCacheKey(placeName, city, category);
    
    // Check cache first
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Try Unsplash with place name and city
    let imageUrl = await this.fetchFromUnsplash(`${placeName} ${city} ${category}`);
    
    // Fallback to category and city
    if (!imageUrl) {
      imageUrl = await this.fetchFromUnsplash(`${category} ${city}`);
    }

    // Fallback to just category
    if (!imageUrl) {
      imageUrl = await this.fetchFromUnsplash(category);
    }

    // Use placeholder if all else fails
    if (!imageUrl) {
      const placeholderImages = [
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1559329007-40df8ac4ef38?w=400&h=300&fit=crop'
      ];
      const index = placeName.length % placeholderImages.length;
      imageUrl = placeholderImages[index];
    }

    // Cache the result
    this.cache[cacheKey] = imageUrl;
    return imageUrl;
  }

  // Note: Static map URL generation requires Google Maps API key configuration
  // via edge functions. Removed to prevent hardcoded API key placeholder.
}

export const imageService = new ImageService();
