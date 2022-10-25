import type { Handler } from '@pabra/logger';
import getLogger, { filters, formatters, transporters } from '@pabra/logger';

const nullFilter = () => false;
const { NODE_ENV } = process.env;
const logFilter =
  NODE_ENV === 'debug'
    ? filters.getMaxLevelFilter('debug')
    : NODE_ENV === 'test'
    ? nullFilter // log nothing while testing
    : NODE_ENV === 'development'
    ? undefined // log everything while developing
    : filters.getMaxLevelFilter('warning'); // log warnings and worse otherwise (in production)

const logHandler: Handler = {
  ...(logFilter === undefined ? null : { filter: logFilter }),
  formatter: formatters.textWithoutDataFormatter,
  transporter: transporters.consoleTransporter,
};

export const logger = getLogger('checkip', logHandler);
