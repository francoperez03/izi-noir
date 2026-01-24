import { useEffect, useState, useRef, RefObject } from 'react';

interface UseScrollProgressOptions {
  // When should animation start (0 = when element top hits viewport bottom, 1 = when element top hits viewport top)
  startOffset?: number;
  // When should animation end (0 = when element bottom hits viewport bottom, 1 = when element bottom hits viewport top)
  endOffset?: number;
  // Use requestAnimationFrame for smoother updates
  smoothing?: boolean;
}

/**
 * Hook to track scroll progress of an element through the viewport.
 * Returns a value from 0 to 1 as the element scrolls through the viewport.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T>,
  options: UseScrollProgressOptions = {}
): number {
  const { startOffset = 0, endOffset = 1, smoothing = true } = options;
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const currentProgress = useRef(0);
  const targetProgress = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const calculateProgress = () => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementHeight = rect.height;

      // Calculate the scroll range
      // Start: when element top is at (1 - startOffset) of viewport height from bottom
      // End: when element bottom is at (endOffset) of viewport height from top
      const startPoint = viewportHeight * (1 - startOffset);
      const endPoint = viewportHeight * endOffset;

      // Where is the element top relative to our range?
      const elementTop = rect.top;
      const elementBottom = rect.bottom;

      // Calculate progress based on how much of the element has scrolled through
      const scrollRange = startPoint - endPoint + elementHeight;
      const currentScroll = startPoint - elementTop;

      const rawProgress = Math.max(0, Math.min(1, currentScroll / scrollRange));
      return rawProgress;
    };

    const handleScroll = () => {
      targetProgress.current = calculateProgress();

      if (!smoothing) {
        setProgress(targetProgress.current);
        return;
      }
    };

    // Smooth animation loop using lerp
    const animate = () => {
      if (smoothing) {
        // Lerp towards target for smooth animation
        const diff = targetProgress.current - currentProgress.current;
        if (Math.abs(diff) > 0.001) {
          currentProgress.current += diff * 0.15; // Smoothing factor
          setProgress(currentProgress.current);
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    // Initial calculation
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    if (smoothing) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [ref, startOffset, endOffset, smoothing]);

  return progress;
}

/**
 * Returns the current stage index based on progress (0-1) and number of stages.
 */
export function getStageFromProgress(progress: number, numStages: number): number {
  return Math.min(Math.floor(progress * numStages), numStages - 1);
}
