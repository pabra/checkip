import http from 'http';
import { URL } from 'url';
import {
  getHost,
  getOrigin,
  getRemoteAddr,
  getResponseFormat,
} from './httpUtils';
import { getResponse } from './utils';

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
  if (req.method === 'OPTIONS' && req.url === '/') {
    const origin = getOrigin(req.headers);

    if (origin && corsHostNames.indexOf(new URL(origin).host) !== -1) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    res.end();

    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end();

    return;
  }

  if (req.url === '/') {
    console.log('req.header:', req.headers); // TODO: remove DEBUG
    // console.log('req.socket:', req.socket); // TODO: remove DEBUG
    console.log('req.socket.remoteFamily:', req.socket.remoteFamily); // TODO: remove DEBUG
    console.log('req.socket.remoteAddress:', req.socket.remoteAddress); // TODO: remove DEBUG
    console.log('req.socket.remotePort:', req.socket.remotePort); // TODO: remove DEBUG
    const remoteAddr = getRemoteAddr(req);

    if (!remoteAddr) {
      res.writeHead(500);
      res.end();

      return;
    }

    const responseFormat = getResponseFormat(req.headers);
    const origin = getOrigin(req.headers);
    const host = getHost(req.headers);
    const { contentTypeHeaderValue, body } = getResponse(
      responseFormat,
      remoteAddr,
      v4Url,
      v6Url,
      v4n6Url,
      host === v4Host ? 'checkip4' : host === v6Host ? 'checkip6' : 'checkip',
    );

    if (origin && corsHostNames.indexOf(new URL(origin).host) !== -1) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.setHeader('Content-Type', contentTypeHeaderValue);
    res.writeHead(200);
    res.end(body);

    // if (isIPv4(remoteAddr)) {
    //   res.write(`IPv4: ${remoteAddr}`);
    // } else if (isIPv6(remoteAddr)) {
    //   res.write(`IPv6: ${remoteAddr}`);
    // } else {
    //   res.write(`unknown: ${remoteAddr}`);
    // }
    //
    // res.end();

    return;
  }

  res.writeHead(404);
  res.end();
});

server.on('listening', () => {
  console.log(`server started on: http://${HOST}:${PORT}`);
});

server.listen({ port: PORT, host: HOST });
