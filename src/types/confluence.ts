/**
 * Confluence-specific type definitions
 */

// Confluence Content types
export interface ConfluencePage {
  id: string;
  type: 'page' | 'blogpost' | 'attachment' | 'comment';
  status: 'current' | 'trashed' | 'draft';
  title: string;
  space: ConfluenceSpace;
  history: ConfluenceContentHistory;
  version: ConfluenceContentVersion;
  ancestors?: ConfluencePage[];
  children?: {
    page?: {
      results: ConfluencePage[];
      offset: number;
      limit: number;
      size: number;
    };
    attachment?: {
      results: ConfluenceAttachment[];
      offset: number;
      limit: number;
      size: number;
    };
    comment?: {
      results: ConfluenceComment[];
      offset: number;
      limit: number;
      size: number;
    };
  };
  descendants?: {
    page?: {
      results: ConfluencePage[];
      offset: number;
      limit: number;
      size: number;
    };
  };
  container?: ConfluenceSpace;
  body?: {
    storage?: ConfluenceContentBody;
    view?: ConfluenceContentBody;
    export_view?: ConfluenceContentBody;
    styled_view?: ConfluenceContentBody;
    editor2?: ConfluenceContentBody;
    anonymous_export_view?: ConfluenceContentBody;
    atlas_doc_format?: ConfluenceContentBody;
  };
  extensions?: Record<string, any>;
  metadata?: {
    properties?: Record<string, any>;
    labels?: ConfluenceLabel[];
    frontend?: {
      title: string;
      editorKey: string;
    };
  };
  _links?: {
    webui: string;
    edit: string;
    tinyui: string;
    self: string;
    base: string;
    context: string;
  };
  _expandable?: {
    childTypes: string;
    container: string;
    metadata: string;
    operations: string;
    restrictions: string;
  };
}

export interface ConfluenceSpace {
  id: number;
  key: string;
  name: string;
  type: 'global' | 'personal';
  status: 'current' | 'archived';
  description?: {
    plain: ConfluenceContentBody;
    view: ConfluenceContentBody;
  };
  homepage?: ConfluencePage;
  metadata?: {
    labels?: ConfluenceLabel[];
  };
  _links?: {
    webui: string;
    self: string;
    base: string;
    context: string;
  };
  _expandable?: {
    settings: string;
    metadata: string;
    operations: string;
    lookAndFeel: string;
    permissions: string;
    icon: string;
    description: string;
    theme: string;
    history: string;
  };
}

export interface ConfluenceUser {
  type: 'known' | 'unknown' | 'anonymous' | 'user';
  accountId?: string;
  accountType?: 'atlassian' | 'app';
  email?: string;
  publicName?: string;
  displayName: string;
  profilePicture?: {
    path: string;
    width: number;
    height: number;
    isDefault: boolean;
  };
  operations?: Array<{
    operation: string;
    targetType: string;
  }>;
  details?: {
    business?: {
      position?: string;
      department?: string;
      location?: string;
    };
    personal?: {
      phone?: string;
      website?: string;
    };
  };
  personalSpace?: ConfluenceSpace;
}

export interface ConfluenceContentBody {
  value: string;
  representation:
    | 'storage'
    | 'view'
    | 'export_view'
    | 'styled_view'
    | 'editor2'
    | 'anonymous_export_view'
    | 'atlas_doc_format';
  embeddedContent?: ConfluenceEmbeddedContent[];
}

export interface ConfluenceEmbeddedContent {
  entityId: string;
  entityType: string;
}

export interface ConfluenceContentHistory {
  latest: boolean;
  createdBy: ConfluenceUser;
  createdDate: string;
  lastUpdated?: {
    by: ConfluenceUser;
    when: string;
    friendlyLastUpdated: string;
    message: string;
    number: number;
    minorEdit: boolean;
    syncRev?: string;
    syncRevSource?: string;
    confRev?: string;
    contentTypeModified?: boolean;
  };
  previousVersion?: {
    by: ConfluenceUser;
    when: string;
    number: number;
    message: string;
    minorEdit: boolean;
  };
  contributors?: {
    publishers?: {
      users: ConfluenceUser[];
      userKeys: string[];
    };
  };
  nextVersion?: {
    by: ConfluenceUser;
    when: string;
    number: number;
    message: string;
    minorEdit: boolean;
  };
}

export interface ConfluenceContentVersion {
  by: ConfluenceUser;
  when: string;
  friendlyWhen: string;
  message: string;
  number: number;
  minorEdit: boolean;
  syncRev?: string;
  syncRevSource?: string;
  confRev?: string;
  contentTypeModified?: boolean;
}

export interface ConfluenceLabel {
  prefix: 'global' | 'my' | 'team';
  name: string;
  id?: string;
  label?: string;
}

export interface ConfluenceComment {
  id: string;
  type: 'comment';
  status: 'current' | 'deleted';
  title: string;
  space?: ConfluenceSpace;
  history: ConfluenceContentHistory;
  version: ConfluenceContentVersion;
  ancestors: ConfluencePage[];
  container: ConfluencePage;
  body: {
    storage: ConfluenceContentBody;
    view: ConfluenceContentBody;
  };
  extensions?: Record<string, any>;
  _links?: {
    webui: string;
    self: string;
    base: string;
    context: string;
  };
}

export interface ConfluenceAttachment {
  id: string;
  type: 'attachment';
  status: 'current';
  title: string;
  space?: ConfluenceSpace;
  history: ConfluenceContentHistory;
  version: ConfluenceContentVersion;
  container: ConfluencePage;
  metadata: {
    mediaType: string;
    fileSize: number;
    comment?: string;
    properties?: Record<string, any>;
  };
  extensions: {
    mediaType: string;
    fileSize: number;
    comment?: string;
  };
  _links: {
    download: string;
    webui: string;
    self: string;
    base: string;
    context: string;
  };
}

// Search types
export interface ConfluenceSearchRequest {
  cql: string;
  cqlcontext?: string;
  excerpt?: 'indexed' | 'highlight' | 'none';
  offset?: number;
  limit?: number;
  includeArchivedSpaces?: boolean;
  expand?: string[];
}

export interface ConfluenceSearchResponse {
  results: ConfluenceSearchResult[];
  offset: number;
  limit: number;
  size: number;
  totalSize: number;
  cqlQuery: string;
  searchDuration: number;
  _links?: {
    base: string;
    context: string;
    self: string;
  };
}

export interface ConfluenceSearchResult {
  content: ConfluencePage | ConfluenceSpace | ConfluenceAttachment | ConfluenceComment;
  user?: ConfluenceUser;
  space?: ConfluenceSpace;
  title: string;
  excerpt?: string;
  url: string;
  resultParentContainer?: {
    title: string;
    displayUrl: string;
  };
  resultGlobalContainer?: {
    title: string;
    displayUrl: string;
  };
  breadcrumbs?: Array<{
    label: string;
    url: string;
    separator: string;
  }>;
  entityType: 'content' | 'space' | 'user';
  iconCssClass?: string;
  lastModified: string;
  friendlyLastModified: string;
}

// Create/Update types
export interface ConfluencePageInput {
  type: 'page' | 'blogpost';
  title: string;
  space: {
    key: string;
  };
  status?: 'current' | 'draft';
  ancestors?: Array<{
    id: string;
  }>;
  body: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  metadata?: {
    properties?: Record<string, any>;
  };
}

export interface ConfluencePageUpdateInput {
  version: {
    number: number;
    message?: string;
    minorEdit?: boolean;
  };
  type: 'page' | 'blogpost';
  title?: string;
  space?: {
    key: string;
  };
  status?: 'current' | 'draft';
  ancestors?: Array<{
    id: string;
  }>;
  body?: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  metadata?: {
    properties?: Record<string, any>;
  };
}

export interface ConfluenceCommentInput {
  type: 'comment';
  container: {
    id: string;
  };
  body: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  ancestors?: Array<{
    id: string;
  }>;
}

export interface ConfluenceLabelInput {
  prefix: 'global' | 'my' | 'team';
  name: string;
}

// Utility types
export type ConfluencePageId = string;
export type ConfluenceSpaceKey = string;
export type ConfluenceSpaceId = string;

// Macro and content format types
export interface ConfluenceMacro {
  name: string;
  parameters?: Record<string, string>;
  body?: string;
}

export interface ConfluenceTable {
  rows: ConfluenceTableRow[];
}

export interface ConfluenceTableRow {
  cells: ConfluenceTableCell[];
}

export interface ConfluenceTableCell {
  content: string;
  type?: 'header' | 'data';
}

// Permission types
export interface ConfluencePermission {
  operation: {
    operation: string;
    targetType: string;
  };
  anonymousAccess: boolean;
  unlicensedAccess: boolean;
  subjects?: {
    user?: {
      results: ConfluenceUser[];
    };
    group?: {
      results: Array<{
        name: string;
        type: string;
      }>;
    };
  };
}

export interface ConfluenceRestriction {
  operation: string;
  restrictions: {
    user?: {
      results: ConfluenceUser[];
    };
    group?: {
      results: Array<{
        name: string;
        type: string;
      }>;
    };
  };
}

// Tool types for Confluence
export interface ConfluenceToolWithHandler extends Omit<import('@modelcontextprotocol/sdk/types.js').Tool, 'handler'> {
  handler: (args: any, context: import('../domains/confluence/shared/tool-context.js').ConfluenceToolContext) => Promise<any>;
}
