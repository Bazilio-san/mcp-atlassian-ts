/**
 * Format description field
 */
export const formatDescription = (description: any): string => {
  if (!description) {
    return '';
  }
  if (typeof description === 'string') {
    return description;
  }

  // Handle JIRA's ADF (Atlassian Document Format)
  if (description && typeof description === 'object') {
    if (description.content) {
      // Simple extraction of text from ADF
      const extractText = (node: any): string => {
        if (node.type === 'text') {
          return node.text || '';
        }
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join('');
        }
        if (node.type === 'hardBreak') {
          return '\n';
        }
        return '';
      };
      return extractText(description);
    }
    return JSON.stringify(description, null, 2);
  }

  return String(description);
};
