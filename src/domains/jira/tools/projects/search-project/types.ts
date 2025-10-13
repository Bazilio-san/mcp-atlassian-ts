// Типы данных для поиска проектов JIRA с помощью string similarity

import { TKeyName } from '../../../../../types';

export interface IssueType {
  id: string;
  name: string;
}

export interface JiraProjectWithIssueTypes { // VVR
  key: string;
  name: string;
  issueTypes: IssueType[];
}

export interface TKeyNameScore extends TKeyName {
  score?: number;  // Схожесть строк (1.0 = идеальное совпадение)
}

export interface ProjectSearchOptions {
  query: string;
  limit?: number;
  threshold?: number; // Порог схожести строк (по умолчанию 0.72)
}

// Символы для кеширования вариаций текста
export const SYM_KEY_LC = Symbol('SYM_KEY_LC');
export const SYM_NAME_LC = Symbol('SYM_NAME_LC');
export const SYM_TR_RU_KEY_LC = Symbol('SYM_TR_RU_KEY_LC');
export const SYM_TR_RU_KEY_UC = Symbol('SYM_TR_RU_KEY_UC');
export const SYM_TR_RU_NAME_LC = Symbol('SYM_TR_RU_NAME_LC');
export const SYM_TR_NAME_UC = Symbol('SYM_TR_NAME_UC');

export type JiraProjectWithSymbols = TKeyName & {
  [SYM_KEY_LC]: string;
  [SYM_NAME_LC]: string;
  [SYM_TR_RU_KEY_LC]: string;
  [SYM_TR_RU_KEY_UC]: string;
  [SYM_TR_RU_NAME_LC]: string;
  [SYM_TR_NAME_UC]: string;
};
