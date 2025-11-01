import { trim } from '../../../../core/utils/text.js';
import { validateDate } from '../../../../core/utils/tools.js';
import { ValidationError } from '../../../../core/errors/ValidationError.js';

export const getVersionData = (args: any): any => {
  let { name, description } = args;
  const { projectId, releaseDate, startDate, archived, released } = args;
  // =========================================================
  name = trim(name).substring(0, 255);
  if (!name) {
    throw new ValidationError('Version name is required');
  }
  if (!trim(projectId)) {
    throw new ValidationError('Project Id is required');
  }

  const versionData: any = {
    name,
    projectId,
  };
  description = trim(description).substring(0, 1000);
  if (description) {
    versionData.description = description;
  }

  if (releaseDate) {
    validateDate(releaseDate, 'Property releaseDate');
    versionData.releaseDate = releaseDate;
  }

  if (startDate) {
    validateDate(startDate, 'Property startDate');
    versionData.startDate = startDate;
  }
  if (archived) {
    versionData.archived = true;
  }
  if (released) {
    versionData.released = true;
  }
  return versionData;
};

