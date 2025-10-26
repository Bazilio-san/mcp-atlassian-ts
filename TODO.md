How is it controlled whether the body is returned as a string or ADF? Can this be managed?

In short:

* **Jira Cloud**

  * `body` in responses for comments and rich-text fields is returned **in ADF (JSON, `type: "doc"`)**.
  * This **cannot be switched** to a string via query parameter.
  * For HTML use **`expand=renderedBody`** (for comments) or **`expand=renderedFields`** (for issue fields, e.g. `description`).

* **Jira Server / Data Center**

  * `body` is returned as **string** (plain/wiki-markup) — depends on the configured field renderer.
  * **Cannot switch to ADF**.
  * HTML is provided by Jira UI/renderer; via REST you can get already rendered fields (e.g., `expand=renderedFields` for an issue). For comments — there may be no equivalent to Cloud's `renderedBody` in older versions.

* **Create/Edit**

  * Cloud: send **ADF JSON** in `body`.
  * Server/DC: send **string** (plain/wiki) according to the field renderer.

Summary: `body` format is determined by **instance type** (Cloud → ADF, Server/DC → string). Cannot control this via query parameter; for HTML use `expand` as above.

====================



Date and time period validation

src/domains/jira/tools/metadata/jira_search_fields.ts // VVA should return population info
