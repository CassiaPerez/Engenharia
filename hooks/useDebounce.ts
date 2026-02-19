import { useRef, useCallback } from 'react';

export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

export const useDebouncedSave = <T>(
  saveFn: (data: T) => Promise<void>,
  delay: number = 1000
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingData = useRef<T | null>(null);

  const save = useCallback(
    (data: T) => {
      pendingData.current = data;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (pendingData.current) {
          try {
            await saveFn(pendingData.current);
            pendingData.current = null;
          } catch (error) {
            console.error('Debounced save error:', error);
          }
        }
      }, delay);
    },
    [saveFn, delay]
  );

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingData.current) {
      try {
        await saveFn(pendingData.current);
        pendingData.current = null;
      } catch (error) {
        console.error('Flush save error:', error);
      }
    }
  }, [saveFn]);

  return { save, flush };
};
