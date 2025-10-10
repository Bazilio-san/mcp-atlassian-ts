/**
 * Extended Tool type with handler
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../shared/tool-context.js';

export interface ToolWithHandler extends Tool {
  handler: (args: any, context: ToolContext) => Promise<any>;
}