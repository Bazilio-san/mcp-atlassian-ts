declare module 'luxon' {
  export class DateTime {
    static now(): DateTime;
    setZone(zone: string): DateTime;
    toFormat(fmt: string): string;
  }
}

// Global echo function used in debug utility
declare function echo(message: string): void;
