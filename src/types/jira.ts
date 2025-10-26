/**
 * JIRA-specific type definitions
 */

// JIRA Issue types
export interface IJiraIssue {
  id: string;
  key: string;
  self: string;
  fields: IJiraIssueFields;
  expand?: string;
  transitions?: IJiraTransition[];
}

// /issue/createmeta
interface IJiraAvatarUrls {
  '48x48': string;
  '24x24': string;
  '16x16': string;
  '32x32': string;
}

// Marks describe formatting (bold, italic, link, etc.)
interface IADFMark {
  type: string;              // e.g. "strong", "em", "link", "code"
  attrs?: Record<string, any>; // e.g. { href: "https://finam.ru" }
}

// Base node type
export interface IADFNode {
  type: string;              // e.g. "paragraph", "text", "codeBlock", "bulletList"
  attrs?: Record<string, any>;
  content?: IADFNode[];       // Nested nodes
  marks?: IADFMark[];         // Text decorations
  text?: string;             // Only for text nodes
}

// Root ADF document
export interface IADFDocument {
  version: number;           // Always 1
  type: 'doc';
  content: IADFNode[];        // Top-level nodes
}

export interface IJiraTimeTracking {
  /** Original estimate as string (e.g., "1w 2d", "3h", "45m") */
  originalEstimate?: string;

  /** Remaining estimate as string */
  remainingEstimate?: string;

  /** Time spent as string */
  timeSpent?: string;

  /** Original estimate in seconds */
  originalEstimateSeconds?: number;

  /** Remaining estimate in seconds */
  remainingEstimateSeconds?: number;

  /** Time spent in seconds */
  timeSpentSeconds?: number;
}

export interface IJiraIssueFields {
  summary: string;
  description?: string | IADFDocument; // Can be string or ADF
  status: IJiraStatus;
  priority?: IJiraPriority;
  assignee?: IJiraUser;
  reporter: IJiraUser;
  created: string;
  updated: string;
  issuetype: IJiraIssueType;
  project: IJiraProject;
  labels?: string[];
  components?: IJiraComponent[];
  fixVersions?: IJiraVersion[];
  versions?: IJiraVersion[];
  parent?: IJiraIssue;
  subtasks?: IJiraIssue[];
  attachment?: IJiraAttachment[];
  comment?: {
    comments: IJiraComment[];
    total: number;
  };
  timetracking?: IJiraTimeTracking;
  watches?: {
    isWatching: boolean;
  }
  worklog?: {
    worklogs: IJiraWorklog[];
    total: number;
  };

  // Custom fields can be added here
  [key: string]: any;
}

export interface IJiraUser {
  self: string;
  name: string; // v2 Server
  key: string; // v2 Server
  accountId: string; // v3 Cloud
  displayName: string;
  emailAddress?: string;
  avatarUrls?: IJiraAvatarUrls;
  active: boolean;
}

export interface IJiraStatus {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  statusCategory: {
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface IJiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface IJiraIssueType {
  self: string;
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
}

export interface IJiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: IJiraUser;
  projectTypeKey: string;
  avatarUrls?: IJiraAvatarUrls;
  components?: IJiraComponent[];
  versions?: IJiraVersion[];
  issuetypes?: IJiraIssueType[];
}

export interface IJiraComponent {
  id: string;
  name: string;
  description?: string;
  lead?: IJiraUser;
  assigneeType: string;
  realAssigneeType: string;
  isAssigneeTypeValid: boolean;
}

export interface IJiraVersion {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  userReleaseDate?: string;
}

export interface IJiraCommentProperty {
  /** The unique key of the property */
  key: string;
  /** The stored value — can be any valid JSON */
  value: any;
}

export interface IJiraComment {
  id: string;
  author: IJiraUser;
  updateAuthor: IJiraUser;
  body: string | IADFDocument; // Can be string or ADF
  renderedBody?: string, // HTML representation of comment text
  created: string;
  updated: string;
  visibility?: {
    type: string;
    value: string;
  };
  properties?: IJiraCommentProperty[];
}

export interface IJiraWorklog {
  id: string;
  author: IJiraUser;
  comment?: string | IADFDocument; // Can be string or ADF
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  visibility?: {
    type: string;
    value: string;
  };
}

export interface IJiraAttachment {
  id: string;
  filename: string;
  author: IJiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

export interface IJiraTransition {
  id: string;
  name: string;
  to: IJiraStatus;
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isConditional: boolean;
  fields?: Record<string, IJiraTransitionField>;
}

export interface IJiraTransitionField {
  required: boolean;
  schema: {
    type: string;
    items?: string;
    system?: string;
  };
  name: string;
  fieldId: string;
  hasDefaultValue: boolean;
  operations: string[];
  allowedValues?: any[];
}


export interface TKeyName {
  key: string,
  name: string,
}

export interface IJiraCreateMetaResponse {
  expand: string;
  projects: IJiraProject[];
}
