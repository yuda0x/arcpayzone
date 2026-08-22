import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => window.matchMedia('(max-width: 768px)').matches, []);
  return { isOpen: useSyncExternalStore(subscribe, getSnapshot, () => false) };
}
