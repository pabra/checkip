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

function getMatchText(match: boolean | null): string {
  return match === null
    ? ''
    : match
    ? ' does match domain name'
    : ' does not match domain name';
}

function getTextBodyText(
  remoteAddress: RemoteAddr,
  matchDomain: boolean | null,
): string {
  const kind = remoteAddress.kind();
  const matchDomainText = getMatchText(matchDomain);

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
  matchDomain: boolean | null,
): string {
  const kind = remoteAddress.kind();

  switch (kind) {
    case 'ipv4':
      return JSON.stringify({
        address: remoteAddress.toString(),
        family: 'IPv4',
        matchDomain,
      });

    case 'ipv6':
      return JSON.stringify({
        address: remoteAddress.toString(),
        family: 'IPv6',
        matchDomain,
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
        logger.err(`error while fetching url '${url}'`, err);
        el.textContent = String(err);
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
  matchDomain: boolean | null,
): string {
  const pageIP = `${
    remoteAddress.kind() === 'ipv4' ? 'IPv4' : 'IPv6'
  }: ${remoteAddress.toString()}`;

  const matchDomainText = getMatchText(matchDomain);

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
    .replace('%matchDomainText%', matchDomainText)
    .replace(
      '%script%',
      `(${htmlScript.toString()})(window, ${JSON.stringify(
        v4Url.toString(),
      )}, ${JSON.stringify(v6Url.toString())})`,
    );
}

function getPrometheusBodyText(
  remoteAddress: RemoteAddr,
  matchDomain: boolean | null,
): string {
  const key = 'checkip_match_domain';
  const family = remoteAddress.kind() === 'ipv4' ? 'IPv4' : 'IPv6';
  const matchDomainValue = matchDomain === null ? '-1' : matchDomain ? 1 : 0;

  return [
    `# HELP ${key} does remote addr match domain IP (-1: unable; 0: does not match; 1: does match)`,
    `# TYPE ${key} gauge`,
    `${key}{family="${family}",address="${remoteAddress.toString()}"} ${matchDomainValue}`,
  ].join('\n');
}

function getBodyText(
  format: ResponseFormat,
  remoteAddr: RemoteAddr,
  v4Url: URL,
  v6Url: URL,
  v4n6Url: URL,
  title: string,
  matchDomain: boolean | null,
): string {
  switch (format) {
    case 'text':
      return getTextBodyText(remoteAddr, matchDomain);

    case 'json':
      return getJsonBodyText(remoteAddr, matchDomain);

    case 'html':
      return getHtmlBodyText(
        remoteAddr,
        v4Url,
        v6Url,
        v4n6Url,
        title,
        matchDomain,
      );

    case 'prometheus':
      return getPrometheusBodyText(remoteAddr, matchDomain);

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
  const [a, aaaa] = domainName
    ? await Promise.allSettled([
        dnsPromises.resolve4(domainName),
        dnsPromises.resolve6(domainName),
      ])
    : [null, null];
  logger.debug('a', a);
  logger.debug('aaaa', aaaa);

  const remoteAddr = parse(remoteAddressText);
  const remoteAddrKind = remoteAddr.kind();
  const isMatchDomain =
    domainName === null
      ? null
      : remoteAddrKind === 'ipv4' && a && a.status === 'fulfilled'
      ? checkIPv4Match(remoteAddr as IPv4, v4Subnet, a.value)
      : remoteAddrKind === 'ipv6' && aaaa && aaaa.status === 'fulfilled'
      ? checkIPv6Match(remoteAddr as IPv6, v6Subnet, aaaa.value)
      : null;

  logger.debug('isMatchDomain', isMatchDomain, domainName);

  const body = getBodyText(
    format,
    remoteAddr,
    v4Url,
    v6Url,
    v4n6Url,
    title,
    isMatchDomain,
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
