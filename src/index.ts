import http from 'http';
import { URL } from 'url';
import {
  getHost,
  getOrigin,
  getProto,
  getRemoteAddr,
  getResponseFormat,
} from './httpUtils';
import { logger as rootLogger } from './logging';
import { getResponse } from './utils';

const logger = rootLogger.getLogger('index');
const PORT = process.env['PORT'];
const HOST = process.env['HOST'];
const V4URL = process.env['V4URL'];
const V6URL = process.env['V6URL'];
const V4N6URL = process.env['V4N6URL'];

if (!HOST) {
  throw new Error('HOST not set');
}

if (!PORT) {
  throw new Error('PORT not set');
}

if (!V4URL) {
  throw new Error('V4URL not set');
}

if (!V6URL) {
  throw new Error('V6URL not set');
}

if (!V4N6URL) {
  throw new Error('V4N6URL not set');
}

const v4n6Url = new URL(V4N6URL);
const v4Url = new URL(V4URL);
const v6Url = new URL(V6URL);
const v4n6Host = v4n6Url.host;
const v4Host = v4Url.host;
const v6Host = v6Url.host;
const corsHostNames = [v4n6Host, v4Host, v6Host];
const server = http.createServer();

server.on('request', (req, res) => {
  try {
    const host = getHost(req.headers);
    const proto = getProto(req.headers);
    const url = new URL(
      req.url ?? '__no_such_pathname__',
      `${proto}://${host}`,
    );

    if (url.pathname !== '/') {
      res.writeHead(404);
      res.end();

      return;
    }

    const origin = getOrigin(req.headers);
    const originHost = origin && new URL(origin).host;

    if (req.method === 'OPTIONS') {
      if (originHost && corsHostNames.indexOf(originHost) !== -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      res.end();

      return;
    } else if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();

      return;
    }

    const remoteAddr = getRemoteAddr(req);
    logger.debug('request headers', req.headers);
    logger.debug('remote address', remoteAddr);

    if (!remoteAddr) {
      res.writeHead(500);
      res.end();

      return;
    }

    const responseFormat = getResponseFormat(req.headers);
    const { contentTypeHeaderValue, body } = getResponse(
      responseFormat,
      remoteAddr,
      v4Url,
      v6Url,
      v4n6Url,
      host === v4Host ? 'checkip4' : host === v6Host ? 'checkip6' : 'checkip',
    );

    if (originHost && corsHostNames.indexOf(originHost) !== -1) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    res.setHeader('Content-Type', contentTypeHeaderValue);
    res.writeHead(200);
    res.end(body);
  } catch (err) {
    logger.err('unhandled error', err);
    res.writeHead(500);
    res.end;
  }
});

server.on('listening', () => {
  logger.info(`server started on: http://${HOST}:${PORT}`);
});

server.listen({ port: PORT, host: HOST });
