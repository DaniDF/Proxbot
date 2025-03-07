import pino from 'pino'

export { Logger }

const Logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'debug',
  transport: {
    target: 'pino-pretty'
  },
})