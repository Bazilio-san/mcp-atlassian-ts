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


export interface TKeyName {
  key: string,
  name: string,
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
