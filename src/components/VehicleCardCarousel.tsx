import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { PhotoComingSoon } from './PhotoComingSoon';
import { getOptimizedImageUrl } from '../lib/fenderApi';

interface VehicleCardCarouselProps {
  photoUrls: string[];
  photoCount?: number;
  alt: string;
  aspectRatio?: string;
  priority?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 40;
const MAX_CARD_PHOTOS = 5;

export function VehicleCardCarousel({
  photoUrls,
  photoCount,
  alt,
  aspectRatio = 'aspect-[4/3]',
  priority = false,
  className = '',
}: VehicleCardCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const hasInteractedRef = useRef(false);

  const photos = photoUrls.slice(0, MAX_CARD_PHOTOS);
  const total = photos.length;
  const totalAllPhotos = photoCount ?? photoUrls.length;

  const preloadNext = useCallback((nextIndex: number) => {
    const nextUrl = photos[nextIndex];
    if (nextUrl) {
      const img = new Image();
      img.src = getOptimizedImageUrl(nextUrl, 'card_mobile');
    }
  }, [photos]);

  const goTo = useCallback((index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    hasInteractedRef.current = true;
    setCurrent(index);
    const ahead = index < total - 1 ? index + 1 : 0;
    preloadNext(ahead);
  }, [total, preloadNext]);

  const prev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasInteractedRef.current = true;
    setCurrent(i => {
      const next = i === 0 ? total - 1 : i - 1;
      const ahead = next === 0 ? total - 1 : next - 1;
      preloadNext(ahead);
      return next;
    });
  }, [total, preloadNext]);

  const next = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasInteractedRef.current = true;
    setCurrent(i => {
      const nextIdx = i === total - 1 ? 0 : i + 1;
      const ahead = nextIdx === total - 1 ? 0 : nextIdx + 1;
      preloadNext(ahead);
      return nextIdx;
    });
  }, [total, preloadNext]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      hasInteractedRef.current = true;
      if (deltaX < 0) {
        setCurrent(i => {
          const nextIdx = i === total - 1 ? 0 : i + 1;
          const ahead = nextIdx === total - 1 ? 0 : nextIdx + 1;
          preloadNext(ahead);
          return nextIdx;
        });
      } else {
        setCurrent(i => {
          const nextIdx = i === 0 ? total - 1 : i - 1;
          const ahead = nextIdx === 0 ? total - 1 : nextIdx - 1;
          preloadNext(ahead);
          return nextIdx;
        });
      }
    }

    touchStartRef.current = null;
    touchStartYRef.current = null;
  }, [total, preloadNext]);

  if (total === 0) {
    return (
      <div className={aspectRatio}>
        <PhotoComingSoon />
      </div>
    );
  }

  const currentUrl = photos[current];
  const mobileSrc = getOptimizedImageUrl(currentUrl, 'card_mobile');
  const desktopSrc = getOptimizedImageUrl(currentUrl, 'card');

  const isSupabaseUrl = currentUrl.includes('supabase.co/storage');
  const srcSet = isSupabaseUrl ? `${mobileSrc} 480w, ${desktopSrc} 800w` : undefined;
  const sizes = isSupabaseUrl ? '(max-width: 640px) 480px, 800px' : undefined;

  return (
    <div
      className={`relative ${aspectRatio} ${className}`}
      onTouchStart={total > 1 ? handleTouchStart : undefined}
      onTouchEnd={total > 1 ? handleTouchEnd : undefined}
    >
      <OptimizedImage
        src={mobileSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        priority={priority}
      />

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-10"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-10"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => goTo(i, e)}
                className={`rounded-full transition-all duration-200 ${
                  i === current
                    ? 'w-2.5 h-2.5 bg-white shadow-lg'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`View photo ${i + 1}`}
              />
            ))}
            {totalAllPhotos > MAX_CARD_PHOTOS && (
              <span className="ml-1 text-white/70 text-[10px] font-medium">
                +{totalAllPhotos - MAX_CARD_PHOTOS}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
