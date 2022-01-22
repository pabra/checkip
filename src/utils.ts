import fs from 'fs';
import type { URL } from 'url';
import { logger as rootLogger } from './logging';
import type { IPv4, IPv6, RemoteAddr, ResponseFormat } from './types';

const logger = rootLogger.getLogger('utils');

function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}

const ipV4Expr = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const ipV6Expr = /^[0-9a-fA-F:]+$/;

function isIPv4(str: string): str is IPv4 {
  return ipV4Expr.test(str);
}

function isIPv6(str: string): str is IPv6 {
  return ipV6Expr.test(str);
}

export function isBrowser(ua: string): boolean {
  return ua.startsWith('Mozilla');
}

export function isContentTypeHtml(contentType: string): boolean {
  return contentType.startsWith('text/html');
}

export function isContentTypeJson(contentType: string): boolean {
  return contentType.startsWith('application/json');
}

export function isContentTypeText(contentType: string): boolean {
  return contentType.startsWith('text/plain');
}

function getContentTypeHeaderValue(format: ResponseFormat): string {
  switch (format) {
    case 'text':
      return 'text/plain';

    case 'html':
      return 'text/html';

    case 'json':
      return 'application/json';

    default:
      assertNever(format);
  }
}

function getTextBodyText(remoteAddress: RemoteAddr): string {
  switch (remoteAddress.type) {
    case 'IPv4':
      return `IPv4: ${remoteAddress.value}`;

    case 'IPv6':
      return `IPv6: ${remoteAddress.value}`;

    case 'unknown':
      return `unknown: ${remoteAddress.value}`;

    default:
      assertNever(remoteAddress);
  }
}

function getJsonBodyText(remoteAddress: RemoteAddr): string {
  switch (remoteAddress.type) {
    case 'IPv4':
      return JSON.stringify({
        address: remoteAddress.value,
        family: remoteAddress.type,
      });

    case 'IPv6':
      return JSON.stringify({
        address: remoteAddress.value,
        family: remoteAddress.type,
      });

    case 'unknown':
      return JSON.stringify({
        address: remoteAddress.value,
        family: remoteAddress.type,
      });

    default:
      assertNever(remoteAddress);
  }
}

const fullHtml = fs.readFileSync('./assets/body.html').toString();
const htmlScript = (
  win: Window & typeof globalThis,
  v4Url: string,
  v6Url: string,
) => {
  const fetchCheckip = (url: string, el: HTMLElement) => {
    win
      .fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then(res => res.json())
      .then(json => {
        const text = `${json.family}: ${json.address}`;
        el.textContent = text;
      })
      .catch(err => {
        console.error(`error while fetching url '${url}'`, err);
        el.textContent = err.toString();
      });
  };

  win.addEventListener('DOMContentLoaded', async () => {
    const ipv4El = win.document.getElementById('ipv4Result');
    const ipv6El = win.document.getElementById('ipv6Result');

    if (!ipv4El) {
      throw new Error('no element with id "ipv4Result"');
    }

    if (!ipv6El) {
      throw new Error('no element with id "ipv6Result"');
    }

    fetchCheckip(v4Url, ipv4El);
    fetchCheckip(v6Url, ipv6El);
  });
};

function getHtmlBodyText(
  remoteAddress: RemoteAddr,
  v4Url: URL,
  v6Url: URL,
  v4n6Url: URL,
  title: string,
): string {
  const pageIP = `${remoteAddress.type}: ${remoteAddress.value}`;

  return fullHtml
    .replace(/%title%/g, title)
    .replace('%ipv4Url%', v4Url.toString())
    .replace('%ipv6Url%', v6Url.toString())
    .replace('%ipv4n6Url%', v4n6Url.toString())
    .replace(
      '%ipv4Active%',
      title === 'checkip4' ? 'style="font-weight: bold"' : '',
    )
    .replace(
      '%ipv6Active%',
      title === 'checkip6' ? 'style="font-weight: bold"' : '',
    )
    .replace(
      '%ipv4n6Active%',
      title === 'checkip' ? 'style="font-weight: bold"' : '',
    )
    .replace('%pageIP%', pageIP)
    .replace(
      '%script%',
      `(${htmlScript.toString()})(window, ${JSON.stringify(
        v4Url.toString(),
      )}, ${JSON.stringify(v6Url.toString())})`,
    );
}

function getBodyText(
  format: ResponseFormat,
  remoteAddr: RemoteAddr,
  v4Url: URL,
  v6Url: URL,
  v4n6Url: URL,
  title: string,
): string {
  switch (format) {
    case 'text':
      return getTextBodyText(remoteAddr);

    case 'json':
      return getJsonBodyText(remoteAddr);

    case 'html':
      return getHtmlBodyText(remoteAddr, v4Url, v6Url, v4n6Url, title);

    default:
      assertNever(format);
  }
}

export function getResponse(
  format: ResponseFormat,
  remoteAddressText: string,
  v4Url: URL,
  v6Url: URL,
  v4n6Url: URL,
  title: string,
): { contentTypeHeaderValue: string; body: string } {
  logger.debug('get response', remoteAddressText);

  const remoteAddr: RemoteAddr = isIPv4(remoteAddressText)
    ? { type: 'IPv4', value: remoteAddressText }
    : isIPv6(remoteAddressText)
    ? { type: 'IPv6', value: remoteAddressText }
    : { type: 'unknown', value: remoteAddressText };

  const body = getBodyText(format, remoteAddr, v4Url, v6Url, v4n6Url, title);

  return {
    contentTypeHeaderValue: getContentTypeHeaderValue(format),
    body,
  };
}
