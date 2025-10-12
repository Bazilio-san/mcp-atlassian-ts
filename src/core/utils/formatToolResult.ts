import { appConfig } from '../../bootstrap/init-config.js';
import { ppj } from './text.js';

/**
 * Format tool result based on configuration
 * Returns either structured content (JSON) or formatted text
 */
export function formatToolResult(json: any): any {
  if (appConfig.isReturnJson) {
    return {
      structuredContent: json,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: ppj(json),
      },
    ],
  };
}