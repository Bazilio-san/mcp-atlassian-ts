// Типы данных для поиска проектов JIRA с помощью string similarity

import { TKeyName } from '../../../../../types';

export interface IssueType {
  id: string;
  name: string;
}

export interface TKeyNameScore extends TKeyName {
  score?: number;  // Схожесть строк (1.0 = идеальное совпадение)
}

export interface ProjectSearchOptions {
  query: string;
  limit?: number;
  threshold?: number; // Порог схожести строк (по умолчанию 0.72)
}
