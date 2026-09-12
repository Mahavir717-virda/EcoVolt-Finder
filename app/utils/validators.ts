/**
 * Validation utility functions
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Returns object with validation details
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12 && /[!@#$%^&*]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Validate full name
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/**
 * Validate reservation time slot
 */
export function validateReservationTime(
  startTime: Date,
  endTime: Date,
  minDurationMinutes: number = 30,
  maxDurationMinutes: number = 240
): {
  isValid: boolean;
  error?: string;
} {
  const now = new Date();
  
  // Start time must be in the future
  if (startTime <= now) {
    return {
      isValid: false,
      error: 'Reservation must be for a future time',
    };
  }
  
  // End time must be after start time
  if (endTime <= startTime) {
    return {
      isValid: false,
      error: 'End time must be after start time',
    };
  }
  
  // Check duration
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  
  if (durationMinutes < minDurationMinutes) {
    return {
      isValid: false,
      error: `Minimum reservation duration is ${minDurationMinutes} minutes`,
    };
  }
  
  if (durationMinutes > maxDurationMinutes) {
    return {
      isValid: false,
      error: `Maximum reservation duration is ${maxDurationMinutes / 60} hours`,
    };
  }
  
  // Reservation shouldn't be too far in the future (7 days max)
  const maxFutureMs = 7 * 24 * 60 * 60 * 1000;
  if (startTime.getTime() - now.getTime() > maxFutureMs) {
    return {
      isValid: false,
      error: 'Reservations can only be made up to 7 days in advance',
    };
  }
  
  return { isValid: true };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Validate phone number (basic US format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
}
