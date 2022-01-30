import type { IPv4, IPv6 } from 'ipaddr.js';

// type Opaque<Type, Token = unknown> = Type & {
//   readonly __opaque__: Token;
// };

export type RemoteAddr = IPv4 | IPv6;
export type ResponseFormat = 'text' | 'json' | 'html' | 'prometheus';
