/**
 * JIRA-specific type definitions
 */

// JIRA Issue types
export interface JiraIssue {
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

export interface IJiraIssueFields {
  summary: string;
  description?: any; // Can be string or ADF
  status: IJiraStatus;
  priority?: IJiraPriority;
  assignee?: IJiraUser;
  reporter: IJiraUser;
  created: string;
  updated: string;
  issuetype: IJiraIssueType;
  project: IJiraProject;
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

export interface IJiraUser {
  self: string;
  accountId: string;
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
  components?: JiraComponent[];
  versions?: JiraVersion[];
  issuetypes?: IJiraIssueType[];
}

export interface JiraComponent {
  id: string;
  name: string;
  description?: string;
  lead?: IJiraUser;
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
  author: IJiraUser;
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
  author: IJiraUser;
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

// Search types
export interface IJiraSearchRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  fieldsByKeys?: boolean;
  properties?: string[];
  validateQuery?: 'strict' | 'warn' | 'none';
}

export interface IJiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
  names?: Record<string, string>;
  schema?: Record<string, IJiraFieldSchema>;
}

export interface IJiraFieldSchema {
  type: string;
  items?: string;
  system?: string;
  custom?: string;
  customId?: number;
}

// Create/Update types
export interface IJiraIssueInput {
  fields: Partial<IJiraIssueFields> & {
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

export interface IJiraCommentInput {
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

export interface IJiraWorklogInput {
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
export interface IJiraBoard {
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

export interface IJiraSprint {
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

export interface IJiraEpic {
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
export type TJiraIssueKey = string;
export type TJiraProjectKey = string;
export type TJiraIssueId = string;
export type TJiraProjectId = string;

export type TIdName = { id: string, name: string };

export interface TKeyName {
  key: string,
  name: string,
}

export interface TKeyNameIssues {
  key: string,
  name: string,
  issueTypes: TIdName[],
  cs?: number,
}

export interface TErrorProjKeyNameResult {
  error?: any,
  result: TKeyName[]
  hash: { [key: string]: TKeyName }
}

export interface IJiraCreateMetaResponse {
  expand: string;
  projects: IJiraProject[];
}
