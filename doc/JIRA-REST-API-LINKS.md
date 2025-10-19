# JIRA REST API Documentation Links

This document contains a mapping of JIRA Agile REST API endpoints used in this project to their official documentation links.

## Agile API Endpoints

### Sprint Management

#### Update Sprint
**Endpoint:** `PUT /rest/agile/1.0/sprint/{sprintId}`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-updateSprint
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-sprintid-put

#### Get Sprint Issues
**Endpoint:** `GET /rest/agile/1.0/sprint/{sprintId}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-getIssuesForSprint
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-sprintid-issue-get

#### Create Sprint
**Endpoint:** `POST /rest/agile/1.0/sprint`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-createSprint
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-post

### Board Management

#### Get Board Sprints
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/sprint`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getAllSprints
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-sprint-get

#### Get Board Issues
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getIssuesForBoard
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-issue-get

#### Get All Boards
**Endpoint:** `GET /rest/agile/1.0/board`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getAllBoards
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-get

#### Get Specific Board
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getBoard
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-get

#### Get Board Configuration
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/configuration`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getConfiguration
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-configuration-get

#### Get Board Projects
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/project`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getProjects
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-project-get

#### Get Board Epics
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/epic`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getEpics
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-epic-get

#### Get Epic Issues on Board
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/epic/{epicId}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getIssuesForEpic
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-epic-epicid-issue-get

#### Get Board Versions
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/version`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getVersions
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-version-get

#### Get Board Properties
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/properties`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getPropertiesKeys
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-properties-get

### Epic Management

#### Add Issues to Epic
**Endpoint:** `POST /rest/agile/1.0/epic/{epicIdOrKey}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/epic-addIssuesToEpic
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-epic/#api-agile-1-0-epic-epicidorkey-issue-post

## Documentation Sources

### Atlassian REST API 8.13.0
Base URL: https://docs.atlassian.com/jira-software/REST/8.13.0/
This is the legacy documentation for JIRA Software REST API version 8.13.0.

### Developer Atlassian REST API v11001
Base URL: https://developer.atlassian.com/server/jira/platform/rest/v11001/
This is the newer documentation for JIRA Platform REST API with more detailed specifications.

## JIRA REST API v2 Endpoints

### User Management

#### Get Current User
**Endpoint:** `GET /rest/api/2/myself`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-myself-get

#### Get User Profile
**Endpoint:** `GET /rest/api/2/user`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-get

#### Search Users
**Endpoint:** `GET /rest/api/2/user/search`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-findUsers
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-search-get

### Issue Management

#### Get Issue
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get

#### Create Issue
**Endpoint:** `POST /rest/api/2/issue`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-post

#### Update Issue
**Endpoint:** `PUT /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-editIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-put

#### Delete Issue
**Endpoint:** `DELETE /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-deleteIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-delete

#### Create Issues in Bulk
**Endpoint:** `POST /rest/api/2/issue/bulk`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssues
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-bulk-post

#### Search Issues
**Endpoint:** `GET /rest/api/2/search`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#search-search
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-get

#### Search Issues (POST)
**Endpoint:** `POST /rest/api/2/search`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#search-searchUsingSearchRequest
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-post

### Issue Transitions

#### Get Issue Transitions
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}/transitions`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getTransitions
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-get

#### Transition Issue
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/transitions`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-doTransition
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-post

### Comments

#### Get Issue Comments
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}/comment`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getComments
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-get

#### Add Comment
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/comment`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addComment
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-post

#### Update Comment
**Endpoint:** `PUT /rest/api/2/issue/{issueIdOrKey}/comment/{commentId}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-updateComment
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-put

#### Delete Comment
**Endpoint:** `DELETE /rest/api/2/issue/{issueIdOrKey}/comment/{commentId}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-deleteComment
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-delete

### Worklogs

#### Get Issue Worklog
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}/worklog`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getWorklog
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-worklogs/#api-rest-api-2-issue-issueidorkey-worklog-get

#### Add Worklog
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/worklog`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addWorklog
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-worklogs/#api-rest-api-2-issue-issueidorkey-worklog-post

### Project Management

#### Get All Projects
**Endpoint:** `GET /rest/api/2/project`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getAllProjects
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-get

#### Get Project
**Endpoint:** `GET /rest/api/2/project/{projectIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProject
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-projectidorkey-get

#### Get Project Versions
**Endpoint:** `GET /rest/api/2/project/{projectIdOrKey}/versions`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProjectVersions
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-project-projectidorkey-versions-get

#### Create Project Version
**Endpoint:** `POST /rest/api/2/version`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#version-createVersion
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-version-post

#### Delete Version
**Endpoint:** `POST /rest/api/2/version/{versionId}/removeAndSwap`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#version-delete
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-version-id-removeandswap-post

### Issue Links

#### Get Link Types
**Endpoint:** `GET /rest/api/2/issueLinkType`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLinkType-getIssueLinkTypes
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-link-types/#api-rest-api-2-issuelinktype-get

#### Create Issue Link
**Endpoint:** `POST /rest/api/2/issueLink`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLink-linkIssues
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-links/#api-rest-api-2-issuelink-post

#### Create Remote Issue Link
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/remotelink`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createOrUpdateRemoteIssueLink
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-remote-links/#api-rest-api-2-issue-issueidorkey-remotelink-post

#### Remove Issue Link
**Endpoint:** `DELETE /rest/api/2/issueLink/{linkId}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLink-deleteIssueLink
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-links/#api-rest-api-2-issuelink-linkid-delete

### Metadata

#### Get Fields
**Endpoint:** `GET /rest/api/2/field`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#field-getFields
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-fields/#api-rest-api-2-field-get

#### Get Priorities
**Endpoint:** `GET /rest/api/2/priority`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#priority-getPriorities
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-priorities/#api-rest-api-2-priority-get

## Notes

This file should only contain **Endpoint:** and **Documentation:** and not touch Documentation Sources yet
