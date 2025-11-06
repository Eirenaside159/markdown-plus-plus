/**
 * Favicon badge utility for showing unsaved changes indicator
 */

let animationFrameId: number | null = null;
let currentOpacity = 1;
let fadingOut = false;
let cachedImage: HTMLImageElement | null = null;
let isImageLoading = false;

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
  console.warn('Failed to preload favicon');
});

/**
 * Updates the favicon with a yellow badge indicator
 */
export function updateFaviconBadge(hasChanges: boolean) {
  console.log('updateFaviconBadge called with hasChanges:', hasChanges);
  
  // Cancel any existing animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.warn('Could not get canvas context');
    return;
  }

  // Use preloaded image
  preloadFavicon().then((img) => {
    // Function to draw the favicon with optional badge
    const drawFavicon = (opacity: number = 1) => {
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
        
        // Draw badge shadow (stronger)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw badge circle
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 179, 8, ${opacity})`; // yellow-500 with opacity
        ctx.fill();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw badge border (thicker, more visible)
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Update favicon
      updateFaviconLink(canvas.toDataURL());
    };

    if (hasChanges) {
      // Start with full opacity for immediate visibility
      currentOpacity = 1;
      fadingOut = true;
      
      // Draw immediately
      console.log('Drawing favicon with badge immediately');
      drawFavicon(currentOpacity);
      
      // Then animate the badge with pulsing effect
      const animate = () => {
        if (fadingOut) {
          currentOpacity -= 0.025;
          if (currentOpacity <= 0.5) {
            fadingOut = false;
          }
        } else {
          currentOpacity += 0.025;
          if (currentOpacity >= 1) {
            fadingOut = true;
          }
        }
        
        drawFavicon(currentOpacity);
        animationFrameId = requestAnimationFrame(animate);
      };
      
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // Reset to original without badge
      console.log('Removing badge from favicon');
      currentOpacity = 1;
      fadingOut = false;
      drawFavicon();
    }
  }).catch(() => {
    console.warn('Failed to update favicon badge');
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
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  currentOpacity = 1;
  fadingOut = false;
  
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (link) {
    link.href = '/favicon.png';
  }
}

