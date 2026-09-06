const format = (level: string, message: string, meta?: unknown[]): string => {
  const metaPart = meta && meta.length ? ` ${meta.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join(' ')}` : '';
  return `[${new Date().toISOString()}] [${level}] ${message}${metaPart}`;
};

export const logger = {
  info: (message: string, ...meta: unknown[]): void => console.log(format('INFO ', message, meta)),
  warn: (message: string, ...meta: unknown[]): void => console.warn(format('WARN ', message, meta)),
  error: (message: string, ...meta: unknown[]): void => console.error(format('ERROR', message, meta)),
  debug: (message: string, ...meta: unknown[]): void => {
    if (process.env.NODE_ENV !== 'production') console.debug(format('DEBUG', message, meta));
  }
};