import { getStorageImages } from '../../services/firebase';

/**
 * Image utility for loading images with Firebase Storage fallback
 * First tries Firebase Storage, then falls back to local assets
 */

// Local asset fallbacks
const LOCAL_ASSETS = {
  atmosphere: require('../../assets/images/ATMOSPHERE.png'),
  atmosphere2: require('../../assets/images/ATMOSPHERE2.jpg'),
  aboutus: require('../../assets/images/aboutus.png'),
  gallery: [
    require('../../assets/images/ATMOSPHERE.png'),
    require('../../assets/images/ATMOSPHERE1.jpg'),
  ],
} as const;

// Cache for Firebase Storage images
let imageCache: { [key: string]: string[] | string | null } = {};
let cacheExpiry: { [key: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  Object.keys(cacheExpiry).forEach(key => {
    if (cacheExpiry[key] < now) {
      delete imageCache[key];
      delete cacheExpiry[key];
    }
  });
}

/**
 * Get single image from Firebase Storage with local fallback
 */
export async function getImageWithFallback(
  storagePath: string, 
  fallbackAsset: keyof typeof LOCAL_ASSETS
): Promise<{ uri: string } | any> {
  clearExpiredCache();
  
  const cacheKey = `single_${storagePath}`;
  
  // Return cached result if available
  if (imageCache[cacheKey] && cacheExpiry[cacheKey] > Date.now()) {
    const cachedImage = imageCache[cacheKey] as string;
    return cachedImage ? { uri: cachedImage } : LOCAL_ASSETS[fallbackAsset];
  }

  try {
    console.log(`🖼️ Loading image from Storage: ${storagePath}`);
    
    // Try to get images from Firebase Storage
    const storageImages = await getStorageImages(storagePath);
    
    if (storageImages && storageImages.length > 0) {
      const firstImage = storageImages[0];
      
      // Cache the result
      imageCache[cacheKey] = firstImage;
      cacheExpiry[cacheKey] = Date.now() + CACHE_DURATION;
      
      console.log(`✅ Loaded image from Firebase Storage: ${storagePath}`);
      return { uri: firstImage };
    } else {
      console.log(`⚠️ No images found in Storage: ${storagePath}, using fallback`);
      
      // Cache the null result to avoid repeated requests
      imageCache[cacheKey] = null;
      cacheExpiry[cacheKey] = Date.now() + CACHE_DURATION;
      
      return LOCAL_ASSETS[fallbackAsset];
    }
  } catch (error) {
    console.warn(`❌ Error loading image from Storage: ${storagePath}`, error);
    
    // Cache the error result
    imageCache[cacheKey] = null;
    cacheExpiry[cacheKey] = Date.now() + CACHE_DURATION;
    
    return LOCAL_ASSETS[fallbackAsset];
  }
}

/**
 * Get multiple images from Firebase Storage with local fallback
 */
export async function getImagesWithFallback(
  storagePath: string,
  fallbackAssets: any[]
): Promise<string[]> {
  clearExpiredCache();
  
  const cacheKey = `multiple_${storagePath}`;
  
  // Return cached result if available
  if (imageCache[cacheKey] && cacheExpiry[cacheKey] > Date.now()) {
    const cachedImages = imageCache[cacheKey] as string[];
    return cachedImages && cachedImages.length > 0 ? cachedImages : [];
  }

  try {
    console.log(`🖼️ Loading images from Storage: ${storagePath}`);
    
    // Try to get images from Firebase Storage
    const storageImages = await getStorageImages(storagePath);
    
    if (storageImages && storageImages.length > 0) {
      // Cache the result
      imageCache[cacheKey] = storageImages;
      cacheExpiry[cacheKey] = Date.now() + CACHE_DURATION;
      
      console.log(`✅ Loaded ${storageImages.length} images from Firebase Storage: ${storagePath}`);
      return storageImages;
    } else {
      console.log(`⚠️ No images found in Storage: ${storagePath}, using fallback`);
      
      // Cache the empty result
      imageCache[cacheKey] = [];
      cacheExpiry[cacheKey] = Date.now() + CACHE_DURATION;
      
      return [];
    }
  } catch (error) {
    console.warn(`❌ Error loading images from Storage: ${storagePath}`, error);
    
    // Cache the error result
    imageCache[cacheKey] = [];
    cacheExpiry[cacheKey] = Date.now() + CACHE_DURATION;
    
    return [];
  }
}

/**
 * Preload images for better performance
 */
export async function preloadImages(): Promise<void> {
  try {
    console.log('🚀 Preloading images...');
    
    // Preload common images in parallel
    await Promise.allSettled([
      getImageWithFallback('atmosphere', 'atmosphere'),
      getImageWithFallback('aboutus', 'aboutus'),
      getImagesWithFallback('gallery', LOCAL_ASSETS.gallery),
    ]);
    
    console.log('✅ Image preloading completed');
  } catch (error) {
    console.warn('⚠️ Error during image preloading:', error);
  }
}

/**
 * Clear all image caches (useful for testing or memory management)
 */
export function clearImageCache(): void {
  imageCache = {};
  cacheExpiry = {};
  console.log('🧹 Image cache cleared');
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getImageCacheStats(): { 
  totalEntries: number; 
  activeEntries: number; 
  expiredEntries: number; 
} {
  const now = Date.now();
  const totalEntries = Object.keys(imageCache).length;
  const activeEntries = Object.keys(cacheExpiry).filter(key => cacheExpiry[key] > now).length;
  const expiredEntries = totalEntries - activeEntries;
  
  return { totalEntries, activeEntries, expiredEntries };
}

// Export local assets for direct access if needed
export { LOCAL_ASSETS };