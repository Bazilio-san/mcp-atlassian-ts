# JIRA REST API Documentation Links

This document contains a mapping of JIRA Agile REST API endpoints used in this project to their official documentation links.

## Agile API Endpoints

### Sprint Management

#### Update Sprint
**Endpoint:** `PUT /rest/agile/1.0/sprint/{sprintId}`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-updateSprint
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-sprintid-put
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/#api-rest-agile-1-0-sprint-sprintid-put

#### Get Sprint Issues
**Endpoint:** `GET /rest/agile/1.0/sprint/{sprintId}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-getIssuesForSprint
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-sprintid-issue-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/#api-rest-agile-1-0-sprint-sprintid-issue-get

#### Create Sprint
**Endpoint:** `POST /rest/agile/1.0/sprint`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-createSprint
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-post
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/#api-rest-agile-1-0-sprint-post

### Board Management

#### Get Board Sprints
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/sprint`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getAllSprints
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-sprint-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-sprint-get

#### Get Board Issues
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getIssuesForBoard
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-issue-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-issue-get

#### Get All Boards
**Endpoint:** `GET /rest/agile/1.0/board`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getAllBoards
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-get

#### Get Specific Board
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getBoard
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-get

#### Get Board Configuration
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/configuration`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getConfiguration
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-configuration-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-configuration-get

#### Get Board Projects
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/project`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getProjects
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-project-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-project-get

#### Get Board Epics
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/epic`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getEpics
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-epic-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-epic-get

#### Get Epic Issues on Board
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/epic/{epicId}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getIssuesForEpic
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-epic-epicid-issue-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-epic-epicid-issue-get

#### Get Board Versions
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/version`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getVersions
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-version-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-version-get

#### Get Board Properties
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/properties`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getPropertiesKeys
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-properties-get
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-properties-get

### Epic Management

#### Add Issues to Epic
**Endpoint:** `POST /rest/agile/1.0/epic/{epicIdOrKey}/issue`
**Documentation:**
- https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/epic-addIssuesToEpic
- https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-epic/#api-agile-1-0-epic-epicidorkey-issue-post
- https://developer.atlassian.com/cloud/jira/software/rest/api-group-epic/#api-rest-agile-1-0-epic-epicidorkey-issue-post

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
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-get
**v3 Notes:** Endpoint path changed to `/rest/api/3/user`. Note: `myself` endpoint may have changed to generic `user` endpoint with query params.

#### Get User Profile
**Endpoint:** `GET /rest/api/2/user`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-get
**v3 Notes:** GET /rest/api/3/user - Get user by accountId or username. No significant differences.

#### Search Users
**Endpoint:** `GET /rest/api/2/user/search`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-findUsers
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-search-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-users-search-get
**v3 Notes:** GET /rest/api/3/users/search - Note plural 'users' in v3.

### Issue Management

#### Get Issue
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
**v3 Notes:** GET /rest/api/3/issue/{issueIdOrKey}. No significant differences.

#### Create Issue
**Endpoint:** `POST /rest/api/2/issue`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
**v3 Notes:** POST /rest/api/3/issue. No significant differences.

#### Update Issue
**Endpoint:** `PUT /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-editIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-put
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
**v3 Notes:** PUT /rest/api/3/issue/{issueIdOrKey}. No significant differences.

#### Delete Issue
**Endpoint:** `DELETE /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-deleteIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-delete
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-delete
**v3 Notes:** DELETE /rest/api/3/issue/{issueIdOrKey}. No significant differences.

#### Create Issues in Bulk
**Endpoint:** `POST /rest/api/2/issue/bulk`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssues
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-bulk-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-bulk-post
**v3 Notes:** POST /rest/api/3/issue/bulk. No significant differences.

#### Search Issues
**Endpoint:** `GET /rest/api/2/search`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#search-search
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-get
**v3 Notes:** GET /rest/api/3/search. No significant differences.

#### Search Issues (POST)
**Endpoint:** `POST /rest/api/2/search`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#search-searchUsingSearchRequest
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post
**v3 Notes:** POST /rest/api/3/search. No significant differences.

### Issue Transitions

#### Get Issue Transitions
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}/transitions`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getTransitions
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
**v3 Notes:** GET /rest/api/3/issue/{issueIdOrKey}/transitions. No significant differences.

#### Transition Issue
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/transitions`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-doTransition
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
**v3 Notes:** POST /rest/api/3/issue/{issueIdOrKey}/transitions. No significant differences.

### Comments

#### Get Issue Comments
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}/comment`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getComments
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get
**v3 Notes:** GET /rest/api/3/issue/{issueIdOrKey}/comment. No significant differences.

#### Add Comment
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/comment`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addComment
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post
**v3 Notes:** POST /rest/api/3/issue/{issueIdOrKey}/comment. No significant differences.

#### Update Comment
**Endpoint:** `PUT /rest/api/2/issue/{issueIdOrKey}/comment/{commentId}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-updateComment
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-put
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-put
**v3 Notes:** PUT /rest/api/3/issue/{issueIdOrKey}/comment/{id}. No significant differences.

#### Delete Comment
**Endpoint:** `DELETE /rest/api/2/issue/{issueIdOrKey}/comment/{commentId}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-deleteComment
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-delete
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-delete
**v3 Notes:** DELETE /rest/api/3/issue/{issueIdOrKey}/comment/{id}. No significant differences.

### Worklogs

#### Get Issue Worklog
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}/worklog`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getWorklog
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-worklogs/#api-rest-api-2-issue-issueidorkey-worklog-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-get
**v3 Notes:** GET /rest/api/3/issue/{issueIdOrKey}/worklog. No significant differences.

#### Add Worklog
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/worklog`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addWorklog
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-worklogs/#api-rest-api-2-issue-issueidorkey-worklog-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-post
**v3 Notes:** POST /rest/api/3/issue/{issueIdOrKey}/worklog. No significant differences.

### Project Management

#### Get All Projects
**Endpoint:** `GET /rest/api/2/project`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getAllProjects
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-get
**v3 Notes:** GET /rest/api/3/project. No significant differences.

#### Get Project
**Endpoint:** `GET /rest/api/2/project/{projectIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProject
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-projectidorkey-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
**v3 Notes:** GET /rest/api/3/project/{projectIdOrKey}. No significant differences.

#### Get Project Versions
**Endpoint:** `GET /rest/api/2/project/{projectIdOrKey}/versions`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProjectVersions
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-project-projectidorkey-versions-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-project-projectidorkey-versions-get
**v3 Notes:** GET /rest/api/3/project/{projectIdOrKey}/versions. No significant differences.

#### Create Project Version
**Endpoint:** `POST /rest/api/2/version`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#version-createVersion
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-version-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-version-post
**v3 Notes:** POST /rest/api/3/version. No significant differences.

#### Delete Version
**Endpoint:** `POST /rest/api/2/version/{versionId}/removeAndSwap`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#version-delete
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-version-id-removeandswap-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-version-id-removeandswap-post
**v3 Notes:** POST /rest/api/3/version/{id}/removeAndSwap. No significant differences.

### Issue Links

#### Get Link Types
**Endpoint:** `GET /rest/api/2/issueLinkType`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLinkType-getIssueLinkTypes
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-link-types/#api-rest-api-2-issuelinktype-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-link-types/#api-rest-api-3-issuelinktype-get
**v3 Notes:** GET /rest/api/3/issueLinkType. No significant differences.

#### Create Issue Link
**Endpoint:** `POST /rest/api/2/issueLink`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLink-linkIssues
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-links/#api-rest-api-2-issuelink-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/#api-rest-api-3-issuelink-post
**v3 Notes:** POST /rest/api/3/issueLink. No significant differences.

#### Create Remote Issue Link
**Endpoint:** `POST /rest/api/2/issue/{issueIdOrKey}/remotelink`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createOrUpdateRemoteIssueLink
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-remote-links/#api-rest-api-2-issue-issueidorkey-remotelink-post
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-remote-links/#api-rest-api-3-issue-issueidorkey-remotelink-post
**v3 Notes:** POST /rest/api/3/issue/{issueIdOrKey}/remotelink. No significant differences.

#### Remove Issue Link
**Endpoint:** `DELETE /rest/api/2/issueLink/{linkId}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLink-deleteIssueLink
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-links/#api-rest-api-2-issuelink-linkid-delete
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/#api-rest-api-3-issuelink-linkid-delete
**v3 Notes:** DELETE /rest/api/3/issueLink/{linkId}. No significant differences.

### Metadata

#### Get Fields
**Endpoint:** `GET /rest/api/2/field`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#field-getFields
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-fields/#api-rest-api-2-field-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get
**v3 Notes:** GET /rest/api/3/field. No significant differences.

#### Get Priorities
**Endpoint:** `GET /rest/api/2/priority`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#priority-getPriorities
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-priorities/#api-rest-api-2-priority-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-priorities/#api-rest-api-3-priority-get
**v3 Notes:** GET /rest/api/3/priority. No significant differences.

### Attachments

#### Get Issue Attachments
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
**v3 Notes:** GET /rest/api/3/issue/{issueIdOrKey} with expand=attachment. No significant differences.

### Issue History

#### Get Issue Changelog
**Endpoint:** `GET /rest/api/2/issue/{issueIdOrKey}`
**Documentation:**
- https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
- https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
- https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
**v3 Notes:** GET /rest/api/3/issue/{issueIdOrKey} with expand=changelog. No significant differences.

## JIRA REST API v2 vs v3 - Implementation Differences

### Overview
Based on analysis of the official Atlassian documentation and API specifications, version 3 of the Jira Cloud platform REST API is the latest version. The main difference between v2 and v3 is the introduction of **Atlassian Document Format (ADF)** support for rich text fields.

### Key Differences Summary

#### 1. Atlassian Document Format (ADF) Support
- **v2 API**: Supports rich text fields in multiple formats (text, wiki markup, HTML)
- **v3 API**: Introduces ADF as the primary format for rich text fields, while maintaining backward compatibility

**Impact on Tools:**
- **Critical for**: Comment operations, issue descriptions, field updates involving rich text
- **Minimal impact for**: Basic CRUD operations, metadata queries, status transitions

#### 2. Endpoint Path Structure
- **v2 API**: `/rest/api/2/...`
- **v3 API**: `/rest/api/3/...`
- **Agile API**: Remains `/rest/agile/1.0/...` (unchanged between versions)

#### 3. Response Structure
- **v2 and v3**: Provide the same collection of operations
- **v3**: Enhanced field consistency and improved data structure for some endpoints

### Endpoint-Specific Analysis

#### User Management
- **Get Current User**: `myself` endpoint in v2 → `user` endpoint in v3 with query parameters
- **Search Users**: `/rest/api/2/user/search` → `/rest/api/3/users/search` (pluralized endpoint)
- **Get User Profile**: No significant differences in implementation

#### Issue Management
- **CRUD Operations**: No significant implementation differences
- **Search Issues**: JQL syntax remains the same, pagination unchanged
- **Bulk Operations**: Response structure consistent between versions

#### Comments and Rich Text Fields
- **Most Critical Differences**: Comment create/update operations
- **v2 Format**: Supports plain text, HTML, or wiki markup
- **v3 Format**: Primary support for ADF, with legacy format support
- **Implementation Impact**: Tools that create/update comments or descriptions may need to handle ADF format

#### Worklog Management
- **Time Tracking**: No significant differences in time tracking operations
- **Worklog Entries**: Same structure and behavior between versions

#### Project and Version Management
- **Project Operations**: No significant implementation differences
- **Version Operations**: Enhanced merge and move operations in v3
- **New v3 Features**: Additional version management endpoints (merge, move)

#### Issue Links and Attachments
- **Link Management**: No significant differences
- **Attachment Operations**: Same expand behavior and structure

### Migration Recommendations

#### For Current Tool Implementation
1. **Low Priority Endpoints** (No immediate changes needed):
   - User profile management
   - Basic issue CRUD operations
   - Project and version queries
   - Issue linking
   - Worklog operations

2. **Medium Priority Endpoints** (Monitor for changes):
   - Search operations (JQL)
   - Transition operations
   - Field metadata operations

3. **High Priority Endpoints** (Consider ADF support):
   - Comment creation/update (`jira_add_comment`, `jira_update_comment`)
   - Issue creation/update with descriptions (`jira_create_issue`, `jira_update_issue`)

#### Implementation Strategy
- **Current Tools**: All existing tools should continue to work with v3 API
- **Rich Text Handling**: Consider adding ADF support for comment and description operations
- **Backward Compatibility**: v3 maintains compatibility with v2 data formats
- **Testing**: Verify comment and description operations work correctly with current implementation

### Agile API Notes
- **Version**: Agile API remains at version 1.0 (`/rest/agile/1.0/...`)
- **No Changes**: No significant differences expected between server and cloud implementations
- **Operations**: Sprint and board management operations remain unchanged

### Conclusion
The migration from v2 to v3 primarily affects rich text field handling through ADF support. Most current tool implementations should work without modification, but enhanced ADF support could improve functionality for comment and description operations.

## Notes

This file should only contain **Endpoint:** and **Documentation:** and not touch Documentation Sources yet
