import { useEffect } from 'react';

const BASE_TITLE = 'SoundSauce';

/**
 * Sets the document title dynamically based on the current page/context.
 * Automatically resets to base title on unmount.
 *
 * @param {string} title - Page-specific title segment (e.g., "Analyze", "Discover")
 * @param {string} [subtitle] - Optional dynamic subtitle (e.g., audio filename, recipe name)
 */
export function usePageTitle(title, subtitle) {
  useEffect(() => {
    if (subtitle) {
      document.title = `${subtitle} — ${title} | ${BASE_TITLE}`;
    } else if (title) {
      document.title = `${title} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [title, subtitle]);
}
