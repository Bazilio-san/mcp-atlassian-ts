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

## Notes

This file should only contain **Endpoint:** and **Documentation:** and not touch Documentation Sources yet
