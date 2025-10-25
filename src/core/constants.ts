const nowUtcNoMs = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
export const inRFC3339 = `in RFC 3339 UTC format (must end with "Z", e.g., ${nowUtcNoMs})`;
console.log(inRFC3339); // VVR
export const inJiraDuration = 'in Jira duration format: Xd, Xh, Xm, Xw. E.g. \'3d\' | \'4h\' | \'2h 15m\'';
export const STATE_ENUM = ['active', 'closed', 'future'];
