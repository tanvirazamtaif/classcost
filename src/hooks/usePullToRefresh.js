import { useState, useCallback } from 'react';

export const usePullToRefresh = (onRefresh, options = {}) => {
  const { threshold = 80, resistance = 2.5 } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const diff = (touchY - touchStart) / resistance;

    if (diff > 0) {
      setPullDistance(Math.min(diff, threshold * 1.5));
    }
  }, [isPulling, isRefreshing, touchStart, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (e) {
        console.error('Refresh failed:', e);
      }
      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
    setTouchStart(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

export default usePullToRefresh;
