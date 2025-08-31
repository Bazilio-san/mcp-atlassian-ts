/**
 * JIRA-specific type definitions
 */

// JIRA Issue types
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
  expand?: string;
  transitions?: JiraTransition[];
}

export interface JiraIssueFields {
  summary: string;
  description?: any; // Can be string or ADF
  status: JiraStatus;
  priority?: JiraPriority;
  assignee?: JiraUser;
  reporter: JiraUser;
  created: string;
  updated: string;
  issuetype: JiraIssueType;
  project: JiraProject;
  labels?: string[];
  components?: JiraComponent[];
  fixVersions?: JiraVersion[];
  versions?: JiraVersion[];
  parent?: JiraIssue;
  subtasks?: JiraIssue[];
  attachment?: JiraAttachment[];
  comment?: {
    comments: JiraComment[];
    total: number;
  };
  worklog?: {
    worklogs: JiraWorklog[];
    total: number;
  };
  // Custom fields can be added here
  [key: string]: any;
}

export interface JiraUser {
  self: string;
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  active: boolean;
}

export interface JiraStatus {
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

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  projectTypeKey: string;
  avatarUrls?: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  components?: JiraComponent[];
  versions?: JiraVersion[];
  issueTypes?: JiraIssueType[];
}

export interface JiraComponent {
  id: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  assigneeType: string;
  realAssigneeType: string;
  isAssigneeTypeValid: boolean;
}

export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  userReleaseDate?: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: any; // Can be string or ADF
  created: string;
  updated: string;
  visibility?: {
    type: string;
    value: string;
  };
}

export interface JiraWorklog {
  id: string;
  author: JiraUser;
  comment?: any; // Can be string or ADF
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

export interface JiraAttachment {
  id: string;
  filename: string;
  author: JiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isConditional: boolean;
  fields?: Record<string, JiraTransitionField>;
}

export interface JiraTransitionField {
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

// Search types
export interface JiraSearchRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  fieldsByKeys?: boolean;
  properties?: string[];
  validateQuery?: 'strict' | 'warn' | 'none';
}

export interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
  names?: Record<string, string>;
  schema?: Record<string, JiraFieldSchema>;
}

export interface JiraFieldSchema {
  type: string;
  items?: string;
  system?: string;
  custom?: string;
  customId?: number;
}

// Create/Update types
export interface JiraIssueInput {
  fields: Partial<JiraIssueFields> & {
    summary: string;
    issuetype: { id: string } | { name: string };
    project: { id: string } | { key: string };
  };
  update?: Record<string, any>;
  properties?: Array<{
    key: string;
    value: any;
  }>;
}

export interface JiraCommentInput {
  body: any; // String or ADF
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  properties?: Array<{
    key: string;
    value: any;
  }>;
}

export interface JiraWorklogInput {
  comment?: any; // String or ADF
  timeSpent: string; // e.g., "1h 30m"
  started?: string; // ISO 8601
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  properties?: Array<{
    key: string;
    value: any;
  }>;
}

// Board and Sprint types (Agile)
export interface JiraBoard {
  id: number;
  self: string;
  name: string;
  type: string;
  location: {
    projectId: number;
    displayName: string;
    projectName: string;
    projectKey: string;
    projectTypeKey: string;
    avatarURI: string;
    name: string;
  };
}

export interface JiraSprint {
  id: number;
  self: string;
  state: 'future' | 'active' | 'closed';
  name: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId: number;
  goal?: string;
}

export interface JiraEpic {
  id: number;
  key: string;
  self: string;
  name: string;
  summary: string;
  color: {
    key: string;
  };
  done: boolean;
}

// Utility types for JIRA operations
export type JiraIssueKey = string;
export type JiraProjectKey = string;
export type JiraIssueId = string;
export type JiraProjectId = string;