В файле tests/jira-endpoints-tester.js
в функции runTests
есть фрагмент
```javascript
const allTestCases = [
...o.getSystemTestCases(),
...o.getInformationalTestCases(),
...o.getIssueDetailedTestCases(),
...o.getSearchDetailedTestCases(),
...o.getProjectDetailedTestCases(),
...o.getUserDetailedTestCases(),
...o.getMetadataDetailedTestCases(),
...o.getModifyingTestCases(),
...o.getAgileTestCases(),
...o.getAdditionalTestCases(),
...o.getWorkflowSchemesTestCases(),
...o.getExtendedTestCases(),
];
```

в модуле tests/core/test-cases.js
нужно сделать свойства     groupNumber и     testNumber геттерами, получающими значения из fullId

        fullId: '9-2',
Удали дубляж. Используй getAllTestCasesFlat
