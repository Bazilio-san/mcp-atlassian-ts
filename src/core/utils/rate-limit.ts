/**
 * Rate limiting utilities
 */

/**
 * Format rate limit error message in Russian
 */
export function formatRateLimitError (errorData: {
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
  isFirstInDuration: boolean;
}, maxRequests: number): string {
  const seconds = Math.ceil(errorData.msBeforeNext / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Format time remaining
  let timeRemaining: string;
  if (minutes > 0) {
    timeRemaining = remainingSeconds > 0
      ? `${minutes} мин ${remainingSeconds} сек`
      : `${minutes} мин`;
  } else {
    timeRemaining = `${seconds} сек`;
  }

  // Calculate next available time
  const nextTime = new Date(Date.now() + errorData.msBeforeNext);
  const timeString = nextTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow'
  });
  const dateString = nextTime.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Moscow'
  });

  return `RateLimit ${maxRequests} requests per minute exceeded. Next request available in ${timeRemaining} (at ${timeString} ${dateString})`;
}

/**
 * Check if error is from rate-limiter-flexible
 */
export function isRateLimitError (error: any): boolean {
  return error &&
    typeof error === 'object' &&
    typeof error.remainingPoints === 'number' &&
    typeof error.msBeforeNext === 'number' &&
    typeof error.consumedPoints === 'number';
}
