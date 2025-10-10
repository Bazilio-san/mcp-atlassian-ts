/**
 * Confluence tool types
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConfluenceToolContext } from './tool-context.js';

export interface ConfluenceToolWithHandler extends Tool {
  handler: (args: any, context: ConfluenceToolContext) => Promise<any>;
}