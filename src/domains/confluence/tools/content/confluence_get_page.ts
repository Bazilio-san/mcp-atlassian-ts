/**
 * Confluence get page tool implementation
 */

import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ToolWithHandler } from '../../../../types/index.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

export const confluence_get_page: ToolWithHandler = {
  name: 'confluence_get_page',
  description: `Get a specific Confluence page by its ID.
Returns the page body content as HTML or converted to Markdown format, includes metadata, ancestors, and structure.
You can extract the page ID from Confluence URLs - for example, from a URL like
https://wiki.yoursite.ru/pages/viewpage.action?pageId=123456789
or
https://yoursite.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title, the page ID is "123456789".`,
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'Confluence page ID. Can be found in page URL.',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: `Additional fields to expand.
Available fields: "body.storage", "body.view", "version", "space", "history", "metadata", "children", "ancestors".
Example: ["body.storage", "metadata"]`,
        default: ['body.storage', 'version', 'space'],
      },
      version: {
        type: 'number',
        description: 'Specific version number to retrieve',
      },
      includeAncestors: {
        type: 'boolean',
        description: `Include page ancestors (breadcrumb path).
When true, shows hierarchical path to this page`,
        default: true,
      },
      includeDescendants: {
        type: 'boolean',
        description: `Include child pages list.
When true, shows all direct child pages`,
        default: false,
      },
      convertToMarkdown: {
        type: 'boolean',
        description: `Convert HTML content to Markdown format.
When true, provides cleaner Markdown output instead of raw HTML`,
        default: true,
      },
    },
    required: ['pageId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve Confluence page by ID',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const {
        pageId,
        expand,
        version,
        includeAncestors = true,
        includeDescendants = false,
        convertToMarkdown = true,
      } = args;

      // Build expand fields based on options
      const expandFields = normalizeToArray(expand);
      if (includeAncestors && !expandFields.includes('ancestors')) {
        expandFields.push('ancestors');
      }
      if (includeDescendants && !expandFields.includes('children.page')) {
        expandFields.push('children.page');
      }

      const cacheKey = `page:${pageId}:${JSON.stringify({ expandFields, version })}`;
      const page = await context.cache.getOrSet(
        cacheKey,
        async () => {
          const params: any = {
            expand: expandFields.join(','),
          };
          if (version) {
            params.version = version;
          }

          const response = await context.httpClient.get(`/rest/api/content/${pageId}`, { params });
          return response.data;
        },
        600, // 10 minutes cache for page content
      );

      // Build result text
      let resultText = `**Confluence Page: ${page.title}**\n\n`;

      // Add breadcrumb path if ancestors included
      if (includeAncestors && page.ancestors && page.ancestors.length > 0) {
        const breadcrumbs = page.ancestors.map((a: any) => a.title).join(' > ');
        resultText += `**Path:** ${breadcrumbs} > ${page.title}\n\n`;
      }

      // Add metadata
      resultText += `**ID:** ${page.id}\n`;
      resultText += `**Space:** ${page.space.name} (${page.space.key})\n`;
      resultText += `**Type:** ${page.type}\n`;
      resultText += `**Status:** ${page.status}\n`;
      resultText += `**Version:** ${page.version.number} (${new Date(page.version.when).toLocaleString()})\n`;
      resultText += `**Created:** ${new Date(page.history.createdDate).toLocaleString()}\n`;
      resultText += `**Creator:** ${page.history.createdBy.displayName}\n`;

      if (page.history.lastUpdated) {
        resultText += `**Last Updated:** ${new Date(page.history.lastUpdated.when).toLocaleString()} by ${
          page.history.lastUpdated.by.displayName
        }\n`;
      }

      // Add content
      if (page.body?.storage) {
        const bodyContent = page.body.storage.value || '';
        const formattedContent = convertToMarkdown
          ? htmlToMarkdown(bodyContent)
          : formatContent(bodyContent);

        resultText += `\n**Content${convertToMarkdown ? ' (Markdown)' : ''}:**\n${formattedContent}\n`;
      }

      // Add child pages if requested
      if (includeDescendants && page.children?.page?.results) {
        const childPages = page.children.page.results;
        if (childPages.length > 0) {
          const childrenList = childPages.map((child: any) => `- ${child.title}`).join('\n');
          resultText += `\n**Child Pages:**\n${childrenList}\n`;
        }
      }

      resultText += `\n**Direct Link:** ${context.config.url}/wiki/spaces/${page.space.key}/pages/${page.id}`;

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      };
    });
  },
};

/**
 * Convert Confluence HTML storage format to Markdown
 */
function htmlToMarkdown (html: string): string {
  if (!html) {
    return '';
  }

  let markdown = html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

    // Code blocks
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

    // Lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')

    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')

    // Tables (basic)
    .replace(/<table[^>]*>/gi, '\n')
    .replace(/<\/table>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '| ')
    .replace(/<\/tr>/gi, ' |\n')
    .replace(/<th[^>]*>(.*?)<\/th>/gi, '$1 | ')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, '$1 | ')

    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')

    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

function formatContent (content: string): string {
  // Basic formatting for storage format content
  if (!content) {
    return '';
  }

  // Remove common Confluence storage format tags for better readability
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace escaped ampersands
    .replace(/&lt;/g, '<') // Replace escaped less-than
    .replace(/&gt;/g, '>') // Replace escaped greater-than
    .trim();
}
