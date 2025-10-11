import dotenv from 'dotenv';
dotenv.config();

console.log(process.cwd())
export const TEST_JIRA_PROJECT = process.env.TEST_JIRA_PROJECT || 'TEST'
export const TEST_ISSUE_KEY = process.env.TEST_ISSUE_KEY || `${TEST_JIRA_PROJECT}-1`
export const TEST_SECOND_ISSUE_KEY = process.env.TEST_SECOND_ISSUE_KEY || `${TEST_JIRA_PROJECT}-2`
export const TEST_EPIC_ISSUE_KEY = process.env.TEST_EPIC_ISSUE_KEY || `${TEST_JIRA_PROJECT}-3`
export const TEST_ISSUE_TYPE_NAME = process.env.TEST_ISSUE_TYPE_NAME || 'Task'
export const TEST_USERNAME = process.env.TEST_USERNAME || 'vpupkin'
export const JIRA_EPIC_LINK_FIELD_ID = process.env.JIRA_EPIC_LINK_FIELD_ID || 'customfield_10014'
