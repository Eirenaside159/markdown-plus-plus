/**
 * Favicon badge utility for showing unsaved changes indicator
 */

let cachedImage: HTMLImageElement | null = null;
let isImageLoading = false;
let currentBadgeState = false; // Track current badge state to avoid redundant updates

// Preload the favicon image
function preloadFavicon(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (cachedImage) {
      resolve(cachedImage);
      return;
    }
    
    if (isImageLoading) {
      // Wait for existing load
      const checkInterval = setInterval(() => {
        if (cachedImage) {
          clearInterval(checkInterval);
          resolve(cachedImage);
        }
      }, 10);
      return;
    }
    
    isImageLoading = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/favicon.png';
    
    img.onload = () => {
      cachedImage = img;
      isImageLoading = false;
      resolve(img);
    };
    
    img.onerror = () => {
      isImageLoading = false;
      reject(new Error('Failed to load favicon'));
    };
  });
}

// Preload on module load
preloadFavicon().catch(() => {
  // Failed to preload favicon
});

/**
 * Updates the favicon with a yellow badge indicator
 */
export function updateFaviconBadge(hasChanges: boolean) {
  // Skip update if badge state hasn't changed
  if (hasChanges === currentBadgeState) {
    return;
  }
  
  currentBadgeState = hasChanges;

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return;
  }

  // Use preloaded image
  preloadFavicon().then((img) => {
    // Clear canvas
    ctx.clearRect(0, 0, 32, 32);
    
    // Draw original favicon
    ctx.drawImage(img, 0, 0, 32, 32);
    
    // Add yellow badge if there are changes
    if (hasChanges) {
      // Badge position: bottom-right corner (more visible)
      const badgeX = 24;
      const badgeY = 24;
      const badgeRadius = 7;
      
      // Draw badge shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // Draw badge circle
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308'; // yellow-500
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    // Update favicon
    updateFaviconLink(canvas.toDataURL());
  }).catch(() => {
    // Failed to update favicon badge
  });
}

/**
 * Updates the favicon link in the document head
 */
function updateFaviconLink(dataUrl: string) {
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  link.href = dataUrl;
}

/**
 * Resets the favicon to original
 */
export function resetFavicon() {
  currentBadgeState = false; // Reset badge state
  
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (link) {
    link.href = '/favicon.png';
  }
}

