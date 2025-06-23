import config from '../config.js'
import { LogLevel, logLevels } from '../types/index.js'

const levels: { [key in LogLevel]: number } = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = levels[config.logging.level]

/**
 * A simple logger utility.
 */
class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private _log(level: LogLevel, message: any, ...args: any[]) {
    if (levels[level] >= currentLevel) {
      const timestamp = new Date().toISOString()
      console.log(
        `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`,
        message,
        ...args,
      )
    }
  }

  public debug(message: any, ...args: any[]) {
    this._log('debug', message, ...args)
  }

  public info(message: any, ...args: any[]) {
    this._log('info', message, ...args)
  }

  public warn(message: any, ...args: any[]) {
    this._log('warn', message, ...args)
  }

  public error(message: any, ...args: any[]) {
    this._log('error', message, ...args)
  }
}

export default (context: string): Logger => new Logger(context)
