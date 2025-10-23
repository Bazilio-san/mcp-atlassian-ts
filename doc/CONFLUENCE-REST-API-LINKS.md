# Confluence REST API Documentation Links

This document contains a mapping of Confluence REST API endpoints used in this 
project to their official documentation links, specifically focused on Confluence 
version 7.13.3.

## Confluence REST API v2 Endpoints

### Content Management

#### Get Page
**Endpoint:** `GET /rest/api/content/{pageId}`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-page
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-id-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-id-get
**7.13.3 Notes:** Standard content retrieval endpoint. Supports expand parameters for body, version, space, history, metadata, children, ancestors.

#### Get Page by Title
**Endpoint:** `GET /rest/api/content` (with query parameters)
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-search
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-get
**7.13.3 Notes:** Uses CQL search with title parameter: `title="Page Title" AND space="SPACE"`

#### Create Page
**Endpoint:** `POST /rest/api/content`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-create
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-post
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-post
**7.13.3 Notes:** Supports page creation with body in storage format, space specification, and ancestor hierarchy.

#### Update Page
**Endpoint:** `PUT /rest/api/content/{pageId}`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-update
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-id-put
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-id-put
**7.13.3 Notes:** Requires version number for optimistic locking. Supports partial updates.

#### Delete Page
**Endpoint:** `DELETE /rest/api/content/{pageId}`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-delete
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-id-delete
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-id-delete
**7.13.3 Notes:** Permanent deletion. Requires appropriate permissions.

#### Search Content
**Endpoint:** `GET /rest/api/content/search`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-search/#search-search
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-search/#api-wiki-rest-api-search-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-search/#api-rest-api-search-get
**7.13.3 Notes:** Uses CQL (Confluence Query Language). Supports pagination, excerpt, and expand parameters.

### Space Management

#### Get Spaces
**Endpoint:** `GET /rest/api/space`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-space/#space-getAll
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-space/#api-wiki-rest-api-space-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-space/#api-rest-api-space-get
**7.13.3 Notes:** Supports type filtering (global, personal) and status filtering (current, archived).

#### Get Space
**Endpoint:** `GET /rest/api/space/{spaceKey}`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-space/#space-get
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-space/#api-wiki-rest-api-space-spacekey-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-space/#api-rest-api-space-spacekey-get
**7.13.3 Notes:** Returns detailed space information including description, homepage, and permissions.

#### Get Space Content
**Endpoint:** `GET /rest/api/space/{spaceKey}/content`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-space/#space-getContent
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-space/#api-wiki-rest-api-space-spacekey-content-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-space/#api-rest-api-space-spacekey-content-get
**7.13.3 Notes:** Retrieves content within a space. Supports content type filtering and pagination.

### Comments Management

#### Add Comment
**Endpoint:** `POST /rest/api/content`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-create
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-post
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-post
**7.13.3 Notes:** Comments are created as content with type="comment" and container set to parent page.

#### Get Comments
**Endpoint:** `GET /rest/api/content/{pageId}/child/comment`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-getChildren
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-id-child-comment-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-id-child-comment-get
**7.13.3 Notes:** Retrieves child comments for a page. Supports pagination and expand parameters.

### Labels Management

#### Add Label
**Endpoint:** `POST /rest/api/content/{contentId}/label`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-label/#label-add
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-label/#api-wiki-rest-api-content-id-label-post
- https://developer.atlassian.com/cloud/confluence/rest/api-group-label/#api-rest-api-content-id-label-post
**7.13.3 Notes:** Supports adding labels to any content type. Labels have prefix (global) and name.

#### Get Labels
**Endpoint:** `GET /rest/api/content/{contentId}/label`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-label/#label-getForContent
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-label/#api-wiki-rest-api-content-id-label-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-label/#api-rest-api-content-id-label-get
**7.13.3 Notes:** Retrieves all labels attached to content. Supports prefix filtering.

#### Get Pages by Label
**Endpoint:** `GET /rest/api/search` (with CQL query)
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-search/#search-search
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-search/#api-wiki-rest-api-search-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-search/#api-rest-api-search-get
**7.13.3 Notes:** Uses CQL query: `label = "labelname" AND type = page`. Supports space filtering.

### Page Hierarchy

#### Get Page Children
**Endpoint:** `GET /rest/api/content/{pageId}/child/page`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-getChildren
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-id-child-page-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-id-child-page-get
**7.13.3 Notes:** Retrieves direct child pages. Supports pagination and expand parameters.

### Version History

#### Get Page History
**Endpoint:** `GET /rest/api/content/{pageId}/history`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-content/#content-getHistory
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-content/#api-wiki-rest-api-content-id-history-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-rest-api-content-id-history-get
**7.13.3 Notes:** Returns version information including last updated details and contributors.

### User Management

#### Search Users
**Endpoint:** `GET /rest/api/user/search`
**Documentation:**
- https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/api-user/#user-search
- https://developer.atlassian.com/server/confluence/rest/v7/api-group-user/#api-wiki-rest-api-user-search-get
- https://developer.atlassian.com/cloud/confluence/rest/api-group-user/#api-rest-api-user-search-get
**7.13.3 Notes:** Supports user search with query parameters. Returns user profiles with display names and email.

## Confluence REST API Version Compatibility

### Confluence 7.13.3 Specific Notes

#### API Version
- **Primary API:** REST API (`/rest/api/...`)
- **Base URL:** `https://your-confluence-domain.com`
- **Authentication:** Basic Auth, Personal Access Tokens, OAuth 2.0

#### Storage Format
- **Content Format:** Confluence Storage Format (HTML-like markup)
- **Body Representation:** `storage` representation for page content
- **Rich Text:** Limited rich text support compared to newer Confluence Cloud versions

#### CQL (Confluence Query Language)
- **Search Syntax:** Full CQL support for content search
- **Fields:** Standard fields available (title, space, type, label, creator, etc.)
- **Operators:** AND, OR, NOT, LIKE, IN, CONTAINS, etc.

#### Pagination
- **Limit:** Maximum 100 results per page for most endpoints
- **Offset:** Zero-based offset for pagination
- **Start:** Alternative to offset parameter in some endpoints

#### Expand Parameters
- **Common Expands:** `body.storage`, `version`, `space`, `history`, `metadata`, `children`, `ancestors`
- **Performance:** Use specific expands to reduce response size
- **Nesting:** Multiple levels of expansion supported

## Confluence 7.13.3 vs Cloud API Differences

### API Structure
- **Server 7.13.3:** REST API (`/rest/api/...`)
- **Cloud:** REST API v1 and v2 available (`/rest/api/...` and `/wiki/api/v2/...`)

### Content Format
- **Server 7.13.3:** Storage format primarily (HTML-like)
- **Cloud:** Supports storage format and newer formats like ADF (Atlassian Document Format)

### Authentication
- **Server 7.13.3:** Basic Auth, Personal Access Tokens, OAuth 2.0
- **Cloud:** OAuth 2.0, API Tokens, Basic Auth (being deprecated)

### Features
- **Server 7.13.3:** Stable feature set for this version
- **Cloud:** Continuous feature updates and newer API endpoints

### Performance
- **Server 7.13.3:** On-premises performance characteristics
- **Cloud:** Cloud-based performance with different scaling characteristics

## Implementation Notes for Confluence 7.13.3

### Caching Strategy
- **Page Content:** 10 minutes cache appropriate for relatively static content
- **Search Results:** 5 minutes cache for search queries
- **User Data:** 15 minutes cache for user profile information

### Error Handling
- **Permission Errors:** Standard HTTP 403 responses
- **Not Found:** HTTP 404 for missing content
- **Validation Errors:** HTTP 400 with detailed error messages

### Rate Limiting
- **Server Environment:** Self-imposed rate limiting recommended
- **Concurrent Requests:** Limit concurrent requests to avoid server overload
- **Bulk Operations:** Use pagination for large data sets

## Documentation Sources

### Confluence Server 7.13.3 REST API Documentation
Base URL: https://docs.atlassian.com/ConfluenceServer/rest/7.13.3/
Official documentation for Confluence Server REST API version 7.13.3.

### Atlassian Developer Documentation
Base URL: https://developer.atlassian.com/server/confluence/rest/v7/
Newer developer-focused documentation with detailed API specifications.

### Confluence Cloud REST API Documentation
Base URL: https://developer.atlassian.com/cloud/confluence/rest/
Latest cloud API documentation for reference and comparison.

## Notes

This documentation focuses on Confluence 7.13.3 as specified in the requirements. 
All API endpoints are validated against this version's capabilities and limitations.
