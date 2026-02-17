import { useState, useEffect, useRef, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: string;
  priority?: boolean;
  onLoad?: () => void;
  srcSet?: string;
  sizes?: string;
}

const DEFAULT_PLACEHOLDER = '/placeholder.svg';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const LOADING_TIMEOUT_MS = 8000;

export function OptimizedImage({
  src,
  alt,
  className = '',
  fallbackSrc = DEFAULT_PLACEHOLDER,
  aspectRatio,
  priority = false,
  onLoad,
  srcSet,
  sizes,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src || fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(!src);
  const [retryKey, setRetryKey] = useState(0);
  const retriesRef = useRef(0);
  const currentSrcRef = useRef(src);
  const prevSrcRef = useRef<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [activeSrcSet, setActiveSrcSet] = useState<string | undefined>(srcSet);

  useEffect(() => {
    currentSrcRef.current = src;
    retriesRef.current = 0;
    setRetryKey(0);

    const isInitialMount = prevSrcRef.current === null;
    prevSrcRef.current = src;

    if (src) {
      setImageSrc(src);
      setActiveSrcSet(srcSet);
      setIsUsingFallback(false);
      if (!isInitialMount) {
        setIsLoading(true);
      }
    } else {
      setImageSrc(fallbackSrc);
      setActiveSrcSet(undefined);
      setIsUsingFallback(true);
      setIsLoading(false);
    }

    const raf = requestAnimationFrame(() => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setIsLoading(false);
      }
    });

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, LOADING_TIMEOUT_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [src, fallbackSrc, srcSet]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (currentSrcRef.current !== src) return;

    if (retriesRef.current < MAX_RETRIES && imageSrc !== fallbackSrc) {
      retriesRef.current++;
      setTimeout(() => {
        if (currentSrcRef.current === src) {
          setRetryKey(prev => prev + 1);
        }
      }, RETRY_DELAY_MS);
      return;
    }

    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setActiveSrcSet(undefined);
      setIsUsingFallback(true);
    }
    setIsLoading(false);
  }, [src, imageSrc, fallbackSrc]);

  const containerClasses = `relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 ${aspectRatio ? aspectRatio : ''} ${className}`;
  const shouldLoadEager = priority || isUsingFallback || imageSrc === fallbackSrc;

  return (
    <div className={containerClasses}>
      {isLoading && !isUsingFallback && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-shimmer bg-[length:200%_100%]" />
      )}
      <img
        ref={imgRef}
        key={retryKey}
        src={imageSrc}
        srcSet={activeSrcSet}
        sizes={sizes}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isLoading && !isUsingFallback ? 'opacity-0' : 'opacity-100'
        }`}
        loading={shouldLoadEager ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={handleLoad}
        onError={handleError}
        decoding="async"
      />
    </div>
  );
}
