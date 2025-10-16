import { DateTime } from 'luxon';
import chalk from 'chalk';

export const DEBUG = (String(process.env.DEBUG || '')).trim();
export const IS_TOTAL_DEBUG = DEBUG === '*';

export interface IDebugOptions {
  noTime?: boolean,
  noPrefix?: boolean,
  prefixColor?: string | 'random',
  messageColor?: string,
  envPrefix?: string,
}

const getDbgRe = (debugPattern: string) => new RegExp(`\\b${debugPattern}\\b`, 'i');

// Supported color map to align with previous af-color names
const colorMap: Record<string, (s: string) => string> = {
  black: chalk.black,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  lGreen: chalk.greenBright,
  lYellow: chalk.yellowBright,
  lBlue: chalk.blueBright,
  lMagenta: chalk.magentaBright,
  lCyan: chalk.cyanBright,
};

function getStyler (color?: string): (s: string) => string {
  if (!color) {return chalk.cyan;}
  if (color in colorMap) {
    const styler = (colorMap as Record<string, (s: string) => string>)[color];
    return styler || chalk.cyan;
  }
  // Also try direct chalk color names if provided like 'red', 'greenBright', etc.
  try {
    const maybe = (chalk as any)[color];
    if (typeof maybe === 'function') {return maybe as (s: string) => string;}
  } catch {}
  return chalk.cyan;
}

export type DebugFn = ((msg: string) => void) & { enabled: boolean };

export function Debug (debugPattern: string, options?: boolean | IDebugOptions): DebugFn {
  let noTime = false;
  let noPrefix = false;
  let prefixColor: string | 'random' | undefined = 'black';
  let messageColor: string | undefined = 'cyan';
  let envPrefix = '';
  if (typeof options === 'boolean') {
    noTime = options;
  } else {
    noTime = Boolean(options?.noTime);
    noPrefix = Boolean(options?.noPrefix);
    prefixColor = options?.prefixColor || 'black';
    messageColor = options?.messageColor || 'cyan';
    envPrefix = options?.envPrefix || '';
  }

  if (prefixColor === 'random') {
    const colors = ['green', 'yellow', 'blue', 'magenta', 'cyan', 'lGreen', 'lYellow', 'lBlue', 'lMagenta', 'lCyan'];
    prefixColor = colors[Math.floor(Math.random() * colors.length)] || 'cyan';
  }

  const prefixStyler = getStyler(prefixColor as string);
  const messageStyler = getStyler(messageColor);

  const debugFn = ((msg: string) => {
    if (debugFn.enabled) {
      const prefix = noPrefix ? '' : `${prefixStyler(debugPattern)}: `;
      const time = noTime ? '' : `${DateTime.now().setZone('UTC').toFormat('HH:mm:ss')}: `;
      console.log(`${time}${prefix}${messageStyler(msg)}`);
    }
  }) as DebugFn;

  const debugEnvValue = envPrefix ? (String(process.env[`${envPrefix}DEBUG`] || '')).trim() : DEBUG;

  debugFn.enabled = IS_TOTAL_DEBUG || (getDbgRe(debugPattern)).test(debugEnvValue);
  return debugFn;
}


/**
 * Логирует ответ от llm до деанонимизации
 */
export const debugJiraTool = Debug('jira-tools', {
  noTime: false,
  noPrefix: false,
  prefixColor: chalk.red as unknown as string,
  messageColor: chalk.blueBright as unknown as string,
});

/**
 * Логирует ответ от llm до деанонимизации
 */
export const debugJiraToolFile = Debug('jira-tools-file', {
  noTime: false,
  noPrefix: false,
  prefixColor: chalk.red as unknown as string,
  messageColor: chalk.blueBright as unknown as string,
});
