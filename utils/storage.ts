// Safe localStorage wrapper functions that handle errors gracefully

/**
 * Safely get item from localStorage
 * Returns null if storage is not available or access is denied
 */
export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to get item "${key}":`, error);
    return null;
  }
};

/**
 * Safely set item in localStorage
 * Returns true if successful, false otherwise
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to set item "${key}":`, error);
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('[Storage] Quota exceeded - storage is full');
    }
    return false;
  }
};

/**
 * Safely remove item from localStorage
 * Returns true if successful, false otherwise
 */
export const safeRemoveItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to remove item "${key}":`, error);
    return false;
  }
};

/**
 * Safely clear all items from localStorage
 * Returns true if successful, false otherwise
 */
export const safeClear = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.warn('[Storage] Failed to clear storage:', error);
    return false;
  }
};

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

