import axios from 'axios';

const JIRA_BASE_URL = 'https://jira.finam.ru';
const username = 'vpupkimn';
const password = '***';
const auth = Buffer.from(`${username}:${password}`).toString('base64');

export const jiraApi = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/2`,
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Simple in-memory cache for Jira priorities
const EPIC_LINK_FIELD = 'customfield_11201';


// Получить все возможные значения для поля customfield_11201 (Epic Link) — все эпики в системе, с фильтром по ключу проекта
export const getEpicForProject = async (projectKey?: string): Promise<{ error: any, result: { key: string, summary: string, epicName: string }[] }> => {
  try {
    const jqlParts = ['issuetype=Epic'];
    if (projectKey) {
      jqlParts.push(`project=${projectKey}`);
    }
    // Исключаем завершённые эпики (статус не в категории Done)
    jqlParts.push('statusCategory != Done');
    const res = await jiraApi.get('/search', {
      params: {
        jql: jqlParts.join(' AND '),
        fields: `summary,${EPIC_LINK_FIELD}`,
        maxResults: 10000,
      },
    });
    if (Array.isArray(res.data.issues)) {
      const epics = res.data.issues.map((epic: any) => ({
        key: epic.key,
        summary: epic.fields.summary,
        epicName: epic.fields.customfield_11202,
      }));
      return {
        error: null,
        result: epics,
      };
    }
    return { error: null, result: [] };
  } catch (e) {
    return { error: e, result: [] };
  }
};
