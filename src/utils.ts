import { promises as dnsPromises } from 'dns';
import fs from 'fs';
import type { IPv4, IPv6 } from 'ipaddr.js';
import { parse } from 'ipaddr.js';
import type { URL } from 'url';
import { logger as rootLogger } from './logging';
import type { RemoteAddr, ResponseFormat } from './types';

const logger = rootLogger.getLogger('utils');
dnsPromises.setServers(['1.1.1.1', '1.0.0.1']);

function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
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
    case 'prometheus':
      return 'text/plain';

    case 'html':
      return 'text/html';

    case 'json':
      return 'application/json';

    default:
      assertNever(format);
  }
}

type Match =
  | { match: boolean; domainName: string }
  | { match: null; domainName: null };

function getMatchText(
  { match, domainName }: Match,
  ensuredMatchingAddr: string | null,
): string {
  const ensuredAddrText =
    ensuredMatchingAddr === null
      ? ''
      : ` but '${ensuredMatchingAddr}' would match`;
  return match === null
    ? ''
    : match
    ? ` does match domain name '${domainName}'${ensuredAddrText}`
    : ` does not match domain name '${domainName}'${ensuredAddrText}`;
}

function getTextBodyText(
  remoteAddress: RemoteAddr,
  match: Match,
  ensuredMatchingAddr: RemoteAddr | null,
): string {
  const kind = remoteAddress.kind();
  const matchDomainText = getMatchText(
    match,
    ensuredMatchingAddr ? ensuredMatchingAddr.toString() : null,
  );

  switch (kind) {
    case 'ipv4':
      return `IPv4: ${remoteAddress.toString()}${matchDomainText}`;

    case 'ipv6':
      return `IPv6: ${remoteAddress.toString()}${matchDomainText}`;

    default:
      assertNever(kind);
  }
}

function getJsonBodyText(
  remoteAddress: RemoteAddr,
  match: Match,
  ensuredMatchingAddr: RemoteAddr | null,
): string {
  const kind = remoteAddress.kind();

  switch (kind) {
    case 'ipv4':
      return JSON.stringify({
        address: remoteAddress.toString(),
        family: 'IPv4',
        ...(match.match === null ? null : { ...match }),
        ...(ensuredMatchingAddr === null
          ? null
          : { matchingAddress: ensuredMatchingAddr.toString() }),
      });

    case 'ipv6':
      return JSON.stringify({
        address: remoteAddress.toString(),
        family: 'IPv6',
        ...(match.match === null ? null : { ...match }),
        ...(ensuredMatchingAddr === null
          ? null
          : { matchingAddress: ensuredMatchingAddr.toString() }),
      });

    default:
      assertNever(kind);
  }
}

const fullHtml = fs.readFileSync('./assets/body.html').toString();
const htmlScript = (
  win: Window & typeof globalThis,
  v4Url: string,
  v6Url: string,
  formatMatch: typeof getMatchText,
) => {
  const fetchCheckip = (url: string, el: HTMLElement) => {
    win
      .fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then(res => res.json())
      .then(json => {
        const { match, domainName, matchingAddress } = json;
        const matchData =
          typeof match === 'boolean' && typeof domainName === 'string'
            ? ({ match, domainName } as const)
            : ({ match: null, domainName: null } as const);
        const matchText = formatMatch(matchData, matchingAddress ?? null);
        const text = `${json.family}: ${json.address}${matchText}`;
        el.textContent = text;
      })
      .catch(err => {
        el.textContent = String(err);
      });
  };

  win.addEventListener('DOMContentLoaded', async () => {
    const ipv4El = win.document.getElementById('ipv4Result');
    const ipv6El = win.document.getElementById('ipv6Result');

    if (!ipv4El) {
      throw new win.Error('no element with id "ipv4Result"');
    }

    if (!ipv6El) {
      throw new win.Error('no element with id "ipv6Result"');
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
  match: Match,
  ensuredMatchingAddr: RemoteAddr | null,
): string {
  const pageIP = `${
    remoteAddress.kind() === 'ipv4' ? 'IPv4' : 'IPv6'
  }: ${remoteAddress.toString()}`;

  const matchDomainText = getMatchText(
    match,
    ensuredMatchingAddr ? ensuredMatchingAddr.toString() : null,
  );
  const v4UrlStr = v4Url.toString();
  const v6UrlStr = v6Url.toString();
  const v4n6UrlStr = v4n6Url.toString();

  return fullHtml
    .replace(/%title%/g, title)
    .replace('%ipv4Url%', v4UrlStr)
    .replace('%ipv6Url%', v6UrlStr)
    .replace('%ipv4n6Url%', v4n6UrlStr)
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
    .replace('%matchDomainText%', matchDomainText)
    .replace(
      '%script%',
      `(${htmlScript.toString()})(window, ${JSON.stringify(
        v4UrlStr,
      )}, ${JSON.stringify(v6UrlStr)}, ${getMatchText.toString()})`,
    );
}

function getPrometheusBodyText(
  remoteAddress: RemoteAddr,
  match: Match,
  ensuredMatchingAddr: RemoteAddr | null,
): string {
  const key = 'checkip_match_domain';
  const family = remoteAddress.kind() === 'ipv4' ? 'IPv4' : 'IPv6';
  const address = remoteAddress.toString();
  const value = match.domainName === null ? '-1' : match.match ? 1 : 0;
  const labels = {
    family,
    address,
    ...(match.domainName === null ? null : { domainName: match.domainName }),
  };
  const formatLabels = (labelsObj: Record<string, string>) =>
    Object.entries(labelsObj)
      .reduce<string[]>((acc, [k, v]) => {
        return [...acc, `${k}=${JSON.stringify(v)}`];
      }, [])
      .join(',');

  const lines = [
    `# HELP ${key} does remote addr match domain IP (-1: unable; 0: does not match; 1: does match)`,
    `# TYPE ${key} gauge`,
    `${key}{${formatLabels(labels)}} ${value}`,
  ];

  if (ensuredMatchingAddr) {
    lines.push(
      `${key}{${formatLabels({
        ...labels,
        address: ensuredMatchingAddr.toString(),
      })}} 1`,
    );
  }

  return lines.join('\n');
}

function getBodyText(
  format: ResponseFormat,
  remoteAddr: RemoteAddr,
  v4Url: URL,
  v6Url: URL,
  v4n6Url: URL,
  title: string,
  match: Match,
  ensuredMatchingAddr: RemoteAddr | null,
): string {
  switch (format) {
    case 'text':
      return getTextBodyText(remoteAddr, match, ensuredMatchingAddr);

    case 'json':
      return getJsonBodyText(remoteAddr, match, ensuredMatchingAddr);

    case 'html':
      return getHtmlBodyText(
        remoteAddr,
        v4Url,
        v6Url,
        v4n6Url,
        title,
        match,
        ensuredMatchingAddr,
      );

    case 'prometheus':
      return getPrometheusBodyText(remoteAddr, match, ensuredMatchingAddr);

    default:
      assertNever(format);
  }
}

function checkIPv4Match(
  v4: IPv4,
  subnet: number,
  addresses: string[],
): boolean {
  return addresses.some(addr => v4.match(parse(addr), subnet));
}

function checkIPv6Match(
  v6: IPv6,
  subnet: number,
  addresses: string[],
): boolean {
  return addresses.some(addr => v6.match(parse(addr), subnet));
}

export async function getResponse({
  format,
  remoteAddressText,
  v4Url,
  v6Url,
  v4n6Url,
  title,
  domainName,
  v4Subnet,
  v6Subnet,
}: {
  format: ResponseFormat;
  remoteAddressText: string;
  v4Url: URL;
  v6Url: URL;
  v4n6Url: URL;
  title: string;
  domainName: string | null;
  v4Subnet: number;
  v6Subnet: number;
}): Promise<{
  contentTypeHeaderValue: string;
  body: string;
}> {
  const [a, aaaa] =
    domainName === null
      ? [null, null]
      : await Promise.allSettled([
          dnsPromises.resolve4(domainName),
          dnsPromises.resolve6(domainName),
        ]);
  logger.debug('a', a);
  logger.debug('aaaa', aaaa);

  const remoteAddr = parse(remoteAddressText);
  const remoteAddrKind = remoteAddr.kind();
  const match: Match =
    domainName === null
      ? { domainName, match: null }
      : remoteAddrKind === 'ipv4' && a?.status === 'fulfilled'
      ? {
          domainName,
          match: checkIPv4Match(remoteAddr as IPv4, v4Subnet, a.value),
        }
      : remoteAddrKind === 'ipv6' && aaaa?.status === 'fulfilled'
      ? {
          domainName,
          match: checkIPv6Match(remoteAddr as IPv6, v6Subnet, aaaa.value),
        }
      : { domainName: null, match: null };

  logger.debug('match', match, domainName);
  const ensuredMatchingAddr =
    match.match === null
      ? null
      : remoteAddrKind === 'ipv4' && a?.status === 'fulfilled'
      ? a.value.map(parse).find(addr => !remoteAddr.match(addr, v4Subnet)) ??
        null
      : remoteAddrKind === 'ipv6' && aaaa?.status === 'fulfilled'
      ? aaaa.value.map(parse).find(addr => !remoteAddr.match(addr, v6Subnet)) ??
        null
      : null;
  logger.debug(
    'ensuredMatchingAddr',
    ensuredMatchingAddr ? ensuredMatchingAddr.toString() : null,
  );

  const body = getBodyText(
    format,
    remoteAddr,
    v4Url,
    v6Url,
    v4n6Url,
    title,
    match,
    ensuredMatchingAddr,
  );

  return {
    contentTypeHeaderValue: getContentTypeHeaderValue(format),
    body,
  };
}

const domainNameExpr = new RegExp(
  // prettier-ignore
  [
    '^',
      '[a-zA-Z]',
      '(?:',
        '[a-zA-Z0-9-]*',
      ')',
      '(?:',
        '\\.[a-zA-Z0-9-]+',
      ')+',
    '$',
  ].join(''),
);

export function getValidDomainName(domain: string | null): null | string {
  return domain === null || !domainNameExpr.test(domain) ? null : domain;
}

export function getValidV4Subnet(value: string | null): number {
  const int = parseInt(value ?? '', 10);

  return int > 0 && int <= 32 ? int : 32;
}

export function getValidV6Subnet(value: string | null): number {
  const int = parseInt(value ?? '', 10);

  return int > 0 && int <= 128 ? int : 128;
}
