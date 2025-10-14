/**
 * Rate limiting utilities
 */

/**
 * Format time duration in Russian
 */
function formatTimeDuration (seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return remainingSeconds > 0
      ? `${minutes} мин ${remainingSeconds} сек`
      : `${minutes} мин`;
  } else {
    return `${seconds} сек`;
  }
}

/**
 * Format next available time in Russian
 */
function formatNextAvailableTime (milliseconds: number): string {
  const nextTime = new Date(Date.now() + milliseconds);
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
  return `${timeString} ${dateString}`;
}

/**
 * Format MCP server rate limit error message (from rate-limiter-flexible)
 */
export function formatRateLimitError (errorData: {
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
  isFirstInDuration: boolean;
}, maxRequests: number): string {
  const seconds = Math.ceil(errorData.msBeforeNext / 1000);
  const timeRemaining = formatTimeDuration(seconds);
  const nextAvailable = formatNextAvailableTime(errorData.msBeforeNext);

  return `Rate limit exceeded ${maxRequests} requests per 1 minute. The next request will be available in ${timeRemaining} (at ${nextAvailable})`;
}

/**
 * Format HTTP rate limit error message (from HTTP 429 responses)
 */
export function formatHttpRateLimitError (retryAfterSeconds: number = 60): string {
  const timeRemaining = formatTimeDuration(retryAfterSeconds);
  const nextAvailable = formatNextAvailableTime(retryAfterSeconds * 1000);

  return `HTTP rate limit exceeded. The next request will be available in ${timeRemaining} (at ${nextAvailable})`;
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
