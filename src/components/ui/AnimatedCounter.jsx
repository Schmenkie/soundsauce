import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter — Smooth count-up animation for social proof stats.
 * Counts from 0 to `end` over `duration` ms using requestAnimationFrame.
 * Supports optional `prefix` and `suffix` (e.g., "$", "+", "K").
 *
 * Uses an easeOutExpo curve for a fast start that decelerates naturally.
 * Triggers animation when the element enters the viewport via IntersectionObserver.
 */
export function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '', className = '' }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  // Trigger animation on viewport entry
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  // Animate count
  useEffect(() => {
    if (!hasAnimated) return;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo: fast start, smooth deceleration
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(eased * end));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [hasAnimated, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
