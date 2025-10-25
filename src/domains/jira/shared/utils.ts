// noinspection UnnecessaryLocalVariableJS

import { isNonEmptyObject, isObject } from '../../../core/utils/tools.js';
import { IADFDocument, IJiraUser } from '../../../types';
// @ts-ignore
import adfToMdConverter from 'adf-to-md';
// @ts-ignore
import mdToAdfConverter from 'md-to-adf';

export const md2Adf = (md: string): IADFDocument => {
  try {
    // mdToAdfConverter returns an object different from what is obtained after this operation
    const normalADF = JSON.parse(JSON.stringify(mdToAdfConverter(md))) as unknown as IADFDocument;
    return normalADF;
  } catch (_err) {
    return md as unknown as IADFDocument;
  }
};

export const stringOrADF2markdown = (description: string | IADFDocument): string => {
  if (!description) {
    return '';
  }

  if (typeof description === 'string') {
    return description;
  }

  if (description && typeof description === 'object' && description?.type === 'doc') {
    try {
      const converted = adfToMdConverter.convert(description);
      return converted.result;
    } catch (_err) {
      return String(description);
    }
  }

  // Fallback
  return String(description);
};


export const jiraUserObj = (u: IJiraUser): {
  name: string | undefined; // v2 Server
  key: string | undefined; // v2 Server
  accountId: string | undefined; // v3 Cloud
  displayName: string;
  emailAddress: string | undefined;
} | undefined => {
  if (!isObject(u)) {
    return undefined;
  }
  const user = {
    // v2
    key: u.key || undefined,
    name: u.name || undefined,
    // v3
    accountId: u.accountId || undefined,
    displayName: u.displayName,
    emailAddress: u.emailAddress,
  };
  return isNonEmptyObject(user) ? user : undefined;
};

export const getVisibility = (what: string) => {
  const visibility = {
    type: 'object',
    description: `${what} visibility restrictions`,
    properties: {
      type: {
        type: 'string',
        enum: ['group', 'role'],
        description: 'Whether visibility of this item is restricted to a group or role',
      },
      value: {
        type: 'string',
        description: 'The name of the group or role that visibility of this item is restricted to',
      },
    },
    required: ['type', 'value'],
  };
  return visibility;
};
