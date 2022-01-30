import type { IncomingHttpHeaders, IncomingMessage } from 'http';
import { logger as rootLogger } from './logging';
import type { ResponseFormat } from './types';
import {
  isBrowser,
  isContentTypeHtml,
  isContentTypeJson,
  isContentTypeText,
} from './utils';

const logger = rootLogger.getLogger('httpUtils');

function getLastOfHeader(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name];

  if (Array.isArray(value)) {
    const lastValue = value[value.length - 1];

    if (!lastValue) {
      logger.err('could not get last element from array', {
        headers,
        name,
        lastValue,
      });
      return undefined;
    }

    return lastValue;
  }

  return value;
}

export function getOrigin(headers: IncomingHttpHeaders): string | undefined {
  const origin = getLastOfHeader(headers, 'origin');

  return origin;
}

export function getHost(headers: IncomingHttpHeaders): string | undefined {
  const forwardedHost = getLastOfHeader(headers, 'x-forwarded-host');
  const host = getLastOfHeader(headers, 'host');

  return forwardedHost ?? host;
}

export function getProto(headers: IncomingHttpHeaders): 'http' | 'https' {
  const proto = getLastOfHeader(headers, 'x-forwarded-proto');

  return proto && proto === 'https' ? proto : 'http';
}

export function getRemoteAddr(req: IncomingMessage): string | undefined {
  const xRealIp = getLastOfHeader(req.headers, 'x-real-ip');
  const xForwardedFor = getLastOfHeader(req.headers, 'x-forwarded-for');

  return (
    xRealIp ??
    (xForwardedFor && xForwardedFor.split(',').map(s => s.trim())[0]) ??
    req.socket.remoteAddress
  );
}

export function getResponseFormat(
  headers: IncomingHttpHeaders,
  formatFromSearchParam: string | null,
): ResponseFormat {
  switch (formatFromSearchParam) {
    case 'text':
      return 'text';

    case 'json':
      return 'json';

    case 'html':
      return 'html';

    case 'prometheus':
      return 'prometheus';
  }

  const contentType = getLastOfHeader(headers, 'content-type');
  const userAgent = getLastOfHeader(headers, 'user-agent');

  if (contentType) {
    if (isContentTypeHtml(contentType)) {
      return 'html';
    } else if (isContentTypeJson(contentType)) {
      return 'json';
    } else if (isContentTypeText(contentType)) {
      return 'text';
    }
  } else if (userAgent) {
    if (isBrowser(userAgent)) {
      return 'html';
    }
  }

  return 'text';
}
