import { appConfig } from '../../bootstrap/init-config.js';
import { ppj } from './text.js';

/**
 * Format tool result based on configuration
 * Returns either structured content (JSON) or formatted text
 */
export function formatToolResult (json: any): any {
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

export const getJsonFromResult = <T = any> (result: any): T => {
  if (appConfig.isReturnJson) {
    return result?.structuredContent as T;
  } else {
    const text = result?.result?.content?.[0]?.text || result?.content?.[0]?.text || '';
    try {
      return JSON.parse(text) as T;
    } catch {
      //
    }
  }
  return undefined as T;
};
