import DOMPurify from 'dompurify';

/**
 * Sanitize user-generated text content to prevent XSS.
 * Strips all HTML tags — we only display plain text from users.
 */
export function sanitize(text) {
  if (!text || typeof text !== 'string') return text || '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}
