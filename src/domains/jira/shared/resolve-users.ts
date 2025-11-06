import type { ToolContext } from '../../../types/tool-context.js';
import { isUserLookupEnabled } from './utils.js';
import { ValidationError } from '../../../core/errors/ValidationError.js';
import axios from 'axios';

export interface IResolveUsersResult {
  assignee?: string;
  reporter?: string;
  warnings?: string[]
}

/**
 * Search for users through a microservice
 */
export const resolveUsersSimple = async (
  assignee: string | undefined,
  reporter: string | undefined,
  context: ToolContext,
): Promise<IResolveUsersResult> => {
  const { config, httpClient, logger } = context;

  // Если микросервис не настроен - используем прямое назначение
  if (!isUserLookupEnabled(context)) {
    const result: IResolveUsersResult = { warnings: [] };
    if (assignee !== undefined) {
      result.assignee = assignee;
    }
    if (reporter !== undefined) {
      result.reporter = reporter;
    }
    return result;
  }
  if (!assignee && !reporter) {
    return {};
  }

  const warnings: string[] = [];
  const usersToResolve = [];

  if (assignee) {
    usersToResolve.push({ field: 'assignee', value: assignee });
  }
  if (reporter) {
    usersToResolve.push({ field: 'reporter', value: reporter });
  }

  // Делаем один запрос к микросервису для всех пользователей
  const resolvedUsers: Record<string, string> = {};

  for (const user of usersToResolve) {
    try {
      logger.debug(`Resolving ${user.field}: "${user.value}"`);

      const response = await axios.post(
        config.userLookup!.serviceUrl,
        {
          query: user.value,
          limit: 15,
        },
        {
          timeout: config.userLookup!.timeoutMs || 3000,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const employees = response.data?.data || [];

      if (employees.length === 0) {
        throw new ValidationError(`Employee "${user.value}" not found in the system`);
      }

      // Excluding those who have been fired
      const activeEmployees = employees.filter((emp: any) => !emp.is_fired);

      if (activeEmployees.length === 0) {
        throw new ValidationError(`Employees found for "${user.value}" are fired`);
      }

      // Looking for an exact match (similarity = 2)
      const exactMatches = activeEmployees.filter((emp: any) => emp.similarity === 2);
      if (exactMatches.length === 1) {
        const emp = exactMatches[0];
        resolvedUsers[user.field] = emp.username;
        if (emp.username !== user.value) {
          warnings.push(`${user.field} "${user.value}" resolved as "${emp.username}" (${emp.person_full_name})`);
        }
        continue;
      }

      // Looking for almost exact matches (similarity = 1)
      const goodMatches = activeEmployees.filter((emp: any) => emp.similarity >= 1);

      if (goodMatches.length === 1) {
        const emp = goodMatches[0];
        resolvedUsers[user.field] = emp.username;
        if (emp.username !== user.value) {
          warnings.push(`${user.field} "${user.value}" resolved as "${emp.username}" (${emp.person_full_name})`);
        }
        continue;
      }

      // Multiple Results - Selection Error
      const candidates = goodMatches.length > 0 ? goodMatches : activeEmployees.slice(0, 5);

      throw new ValidationError(
        `Found multiple employees for "${user.value}". Select the exact option:`,
        {
          candidates: candidates.map((emp: any) => ({
            username: emp.username,
            displayName: emp.person_full_name,
            email: emp.email,
            department: emp.department_name,
            position: emp.position_name,
            score: emp.similarity,
            suggestion: `Use "${emp.username}" to specify exactly`,
          })),
        },
      );

    } catch (error) {
      logger.error(`User lookup failed for ${user.field} "${user.value}": ${error}`);
      throw error instanceof ValidationError
        ? error
        : new ValidationError(`The user search service is not available: ${error}`);
    }
  }

  const result: IResolveUsersResult = { warnings };
  const finalAssignee = resolvedUsers.assignee || assignee;
  const finalReporter = resolvedUsers.reporter || reporter;
  if (finalAssignee !== undefined) {
    result.assignee = finalAssignee;
  }
  if (finalReporter !== undefined) {
    result.reporter = finalReporter;
  }
  return result;
};
