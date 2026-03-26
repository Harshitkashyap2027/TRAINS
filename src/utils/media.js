/**
 * AETHER – Media Utility
 * Client-side image/video processing helpers using Canvas API.
 */

import { uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ─── Image Processing ────────────────────────────────────────────────────────

/**
 * Compress an image file using the Canvas API.
 * @param {File} file         Source image file
 * @param {number} maxWidth   Maximum output width in pixels (default 1920)
 * @param {number} maxHeight  Maximum output height in pixels (default 1080)
 * @param {number} quality    JPEG/WebP quality 0–1 (default 0.8)
 * @returns {Promise<Blob>}
 */
export function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      let { width, height } = img;

      // Scale down preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null.'));
        },
        outputType,
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Failed to load image for compression.'));
    };
    img.src = objectURL;
  });
}

/**
 * Generate a thumbnail Blob from a video file at the given time offset.
 * @param {File} videoFile
 * @param {number} time  Time in seconds to capture (default 1)
 * @returns {Promise<Blob>}
 */
export function generateThumbnail(videoFile, time = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectURL = URL.createObjectURL(videoFile);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Clamp seek time to video duration
      video.currentTime = Math.min(time, video.duration - 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectURL);
      canvas.toBlob(
        (blob) => {
          video.src = '';
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate thumbnail.'));
        },
        'image/jpeg',
        0.85,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Failed to load video for thumbnail generation.'));
    };

    video.src = objectURL;
  });
}

/**
 * Get the pixel dimensions of an image file.
 * @param {File} file
 * @returns {Promise<{ width: number, height: number }>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Failed to load image to get dimensions.'));
    };
    img.src = objectURL;
  });
}

/**
 * Crop an image file to a centred square.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export function cropImageToSquare(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = Math.floor((img.naturalWidth - size) / 2);
      const sy = Math.floor((img.naturalHeight - size) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to crop image.'));
        },
        outputType,
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Failed to load image for cropping.'));
    };
    img.src = objectURL;
  });
}

/**
 * Resize an image to exact dimensions (may distort aspect ratio).
 * @param {File} file
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Blob>}
 */
export function resizeImage(file, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to resize image.'));
        },
        outputType,
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Failed to load image for resizing.'));
    };
    img.src = objectURL;
  });
}

/**
 * Convert a File or Blob to a data URL string.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file as data URL.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a data URL string back to a Blob.
 * @param {string} dataURL
 * @returns {Blob}
 */
export function dataURLToBlob(dataURL) {
  const [header, data] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Generate a canvas-based avatar with initials and return a data URL.
 * @param {string} name       Full name to derive initials from
 * @param {number} size       Canvas size in pixels (default 128)
 * @param {string} bgColor    Background colour (default derived from name)
 * @param {string} textColor  Text colour (default '#ffffff')
 * @returns {string}  Data URL of the generated avatar
 */
export function generateAvatar(name = '?', size = 128, bgColor, textColor = '#ffffff') {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Derive a consistent colour from the name if none provided
  if (!bgColor) {
    const palette = [
      '#7c3aed', '#2563eb', '#059669', '#d97706',
      '#dc2626', '#7c3aed', '#0891b2', '#be185d',
    ];
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) & 0xffffffff;
    bgColor = palette[Math.abs(hash) % palette.length];
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Initials text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${Math.round(size * 0.38)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials || '?', size / 2, size / 2);

  return canvas.toDataURL('image/png');
}

// ─── Firebase Storage Upload ─────────────────────────────────────────────────

/**
 * Upload a file to Firebase Storage with progress callbacks.
 * @param {import('firebase/storage').StorageReference} storageRef  Firebase StorageReference
 * @param {File|Blob} file
 * @param {(progress: number) => void} onProgress  Called with 0–100
 * @returns {Promise<string>}  Download URL of the uploaded file
 */
export function uploadWithProgress(storageRef, file, onProgress) {
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (typeof onProgress === 'function') onProgress(Math.round(progress));
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

// ─── File Helpers ─────────────────────────────────────────────────────────────

/**
 * Return the lowercase extension of a filename (without the dot).
 * @param {string} filename
 * @returns {string}
 */
export function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Return a MIME type string for a given file extension.
 * @param {string} extension  Without the leading dot
 * @returns {string}
 */
export function getMimeType(extension) {
  const map = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    ico: 'image/x-icon',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    // Documents
    pdf: 'application/pdf',
    json: 'application/json',
    zip: 'application/zip',
    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    md: 'text/markdown',
  };
  return map[extension?.toLowerCase()] || 'application/octet-stream';
}

/**
 * Check if a URL appears to point to an image based on its path.
 * @param {string} url
 * @returns {boolean}
 */
export function isImageURL(url) {
  if (!url) return false;
  try {
    const { pathname } = new URL(url);
    const ext = getFileExtension(pathname);
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'ico', 'bmp', 'tiff'];
    return imageExtensions.includes(ext);
  } catch {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|avif|ico|bmp|tiff)(\?.*)?$/i;
    return imageExtensions.test(url);
  }
}

/**
 * Create a temporary object URL for a File or Blob.
 * Remember to revoke it after use to free memory.
 * @param {File|Blob} file
 * @returns {string}
 */
export function createObjectURL(file) {
  return URL.createObjectURL(file);
}

/**
 * Revoke a previously created object URL to release memory.
 * @param {string} url
 */
export function revokeObjectURL(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
