/**
 * AETHER – Validators Utility
 * Input validation helpers used across forms and data submission.
 */

/**
 * Validate an email address.
 * @param {string} email
 * @returns {{ valid: boolean, error: string }}
 */
export function validateEmail(email) {
  if (!email || !email.trim()) return { valid: false, error: 'Email is required.' };
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!re.test(email.trim())) return { valid: false, error: 'Please enter a valid email address.' };
  return { valid: true, error: '' };
}

/**
 * Validate a password.
 * Requirements: min 8 chars, at least one uppercase letter, one number.
 * @param {string} password
 * @returns {{ valid: boolean, error: string, strength: 'weak'|'fair'|'strong'|'very-strong' }}
 */
export function validatePassword(password) {
  if (!password) return { valid: false, error: 'Password is required.', strength: 'weak' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters.', strength: 'weak' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one uppercase letter.', strength: 'weak' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number.', strength: 'fair' };

  // Determine strength
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  let strength = 'weak';
  if (score >= 6) strength = 'very-strong';
  else if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'fair';

  return { valid: true, error: '', strength };
}

/**
 * Validate a username (alphanumeric + underscore, 3–20 characters).
 * @param {string} username
 * @returns {{ valid: boolean, error: string }}
 */
export function validateUsername(username) {
  if (!username || !username.trim()) return { valid: false, error: 'Username is required.' };
  const trimmed = username.trim();
  if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters.' };
  if (trimmed.length > 20) return { valid: false, error: 'Username must be 20 characters or fewer.' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { valid: false, error: 'Username may only contain letters, numbers and underscores.' };
  if (/^_|_$/.test(trimmed)) return { valid: false, error: 'Username cannot start or end with an underscore.' };
  return { valid: true, error: '' };
}

/**
 * Validate a URL format.
 * @param {string} url
 * @returns {{ valid: boolean, error: string }}
 */
export function validateURL(url) {
  if (!url || !url.trim()) return { valid: false, error: 'URL is required.' };
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https.' };
    }
    return { valid: true, error: '' };
  } catch {
    return { valid: false, error: 'Please enter a valid URL.' };
  }
}

/**
 * Validate a GitHub repository URL specifically.
 * @param {string} url
 * @returns {{ valid: boolean, error: string }}
 */
export function validateGithubURL(url) {
  if (!url || !url.trim()) return { valid: false, error: 'GitHub URL is required.' };
  const re = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/;
  if (!re.test(url.trim())) {
    return { valid: false, error: 'Please enter a valid GitHub repository URL (e.g. https://github.com/user/repo).' };
  }
  return { valid: true, error: '' };
}

/**
 * Validate a file's MIME type against an allowed list.
 * @param {File} file
 * @param {string[]} allowedTypes  Array of MIME types, e.g. ['image/png', 'image/jpeg']
 * @returns {{ valid: boolean, error: string }}
 */
export function validateFileType(file, allowedTypes) {
  if (!file) return { valid: false, error: 'No file provided.' };
  if (!allowedTypes || allowedTypes.length === 0) return { valid: true, error: '' };
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed. Allowed: ${allowedTypes.join(', ')}.` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate that a file does not exceed a maximum size in megabytes.
 * @param {File} file
 * @param {number} maxMB
 * @returns {{ valid: boolean, error: string }}
 */
export function validateFileSize(file, maxMB) {
  if (!file) return { valid: false, error: 'No file provided.' };
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File size exceeds ${maxMB}MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate a user bio (max 160 characters).
 * @param {string} bio
 * @returns {{ valid: boolean, error: string }}
 */
export function validateBio(bio) {
  if (!bio) return { valid: true, error: '' }; // bio is optional
  if (bio.length > 160) return { valid: false, error: 'Bio must be 160 characters or fewer.' };
  return { valid: true, error: '' };
}

/**
 * Validate a display name (not empty, max 50 characters).
 * @param {string} name
 * @returns {{ valid: boolean, error: string }}
 */
export function validateDisplayName(name) {
  if (!name || !name.trim()) return { valid: false, error: 'Display name is required.' };
  if (name.trim().length > 50) return { valid: false, error: 'Display name must be 50 characters or fewer.' };
  return { valid: true, error: '' };
}

/**
 * Validate post content (not empty, max 2000 characters).
 * @param {string} text
 * @returns {{ valid: boolean, error: string }}
 */
export function validatePostContent(text) {
  if (!text || !text.trim()) return { valid: false, error: 'Post content cannot be empty.' };
  if (text.trim().length > 2000) return { valid: false, error: 'Post content must be 2000 characters or fewer.' };
  return { valid: true, error: '' };
}

/**
 * Validate a project title (not empty, max 100 characters).
 * @param {string} title
 * @returns {{ valid: boolean, error: string }}
 */
export function validateProjectTitle(title) {
  if (!title || !title.trim()) return { valid: false, error: 'Project title is required.' };
  if (title.trim().length > 100) return { valid: false, error: 'Project title must be 100 characters or fewer.' };
  return { valid: true, error: '' };
}

/**
 * Validate a single tag (max 20 chars, alphanumeric and hyphens only).
 * @param {string} tag
 * @returns {{ valid: boolean, error: string }}
 */
export function validateTag(tag) {
  if (!tag || !tag.trim()) return { valid: false, error: 'Tag cannot be empty.' };
  const trimmed = tag.trim().toLowerCase();
  if (trimmed.length > 20) return { valid: false, error: 'Each tag must be 20 characters or fewer.' };
  if (!/^[a-z0-9-]+$/.test(trimmed)) return { valid: false, error: 'Tags may only contain lowercase letters, numbers, and hyphens.' };
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) return { valid: false, error: 'Tags cannot start or end with a hyphen.' };
  return { valid: true, error: '' };
}

/**
 * Validate an array of tags (each valid, max 10 tags total).
 * @param {string[]} tags
 * @returns {{ valid: boolean, error: string }}
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) return { valid: false, error: 'Tags must be an array.' };
  if (tags.length > 10) return { valid: false, error: 'You can add a maximum of 10 tags.' };
  for (const tag of tags) {
    const result = validateTag(tag);
    if (!result.valid) return result;
  }
  return { valid: true, error: '' };
}

/**
 * Sanitize a string to remove potential XSS threats.
 * Strips all HTML tags, dangerous URL schemes, and event handler patterns.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeInput(str) {
  if (!str) return '';

  // Step 1: Remove all HTML/XML tags (including variations with whitespace and
  // attributes), using a greedy match so nested tags are collapsed.
  // We iterate until no more tags are found to handle obfuscated nesting.
  let result = str;
  let previous;
  do {
    previous = result;
    // Strip any tag-like construct, including mis-formed ones
    result = result.replace(/<[^>]*>?/gm, '');
  } while (result !== previous);

  // Step 2: Strip dangerous URL schemes (case-insensitive, ignoring whitespace/
  // null-bytes that attackers insert to bypass simple string checks).
  // Covers: javascript:, vbscript:, data:, and null-byte-padded variants.
  result = result.replace(/[\u0000\s]*(j[\u0000\s]*a[\u0000\s]*v[\u0000\s]*a[\u0000\s]*s[\u0000\s]*c[\u0000\s]*r[\u0000\s]*i[\u0000\s]*p[\u0000\s]*t[\u0000\s]*:)/gi, '');
  result = result.replace(/[\u0000\s]*(v[\u0000\s]*b[\u0000\s]*s[\u0000\s]*c[\u0000\s]*r[\u0000\s]*i[\u0000\s]*p[\u0000\s]*t[\u0000\s]*:)/gi, '');
  result = result.replace(/[\u0000\s]*(d[\u0000\s]*a[\u0000\s]*t[\u0000\s]*a[\u0000\s]*:)/gi, '');

  // Step 3: Collapse excessive whitespace left by the above replacements.
  result = result.replace(/\s{3,}/g, '  ').trim();

  return result;
}

/**
 * Check if a file is a valid image.
 * @param {File} file
 * @returns {{ valid: boolean, error: string }}
 */
export function isValidImageFile(file) {
  // SVG is intentionally excluded: SVG files can contain embedded JavaScript
  // and pose an XSS risk when rendered by the browser without sanitisation.
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
  return validateFileType(file, allowed);
}

/**
 * Check if a file is a valid video.
 * @param {File} file
 * @returns {{ valid: boolean, error: string }}
 */
export function isValidVideoFile(file) {
  // Restricted to modern web-standard formats for broad browser compatibility
  // and reduced attack surface from legacy container formats.
  const allowed = ['video/mp4', 'video/webm', 'video/ogg'];
  return validateFileType(file, allowed);
}
