type Opaque<Type, Token = unknown> = Type & {
  readonly __opaque__: Token;
};

export type IPv4 = Opaque<string, 'IPv4'>;
export type IPv6 = Opaque<string, 'IPv6'>;
export type RemoteAddr =
  | { type: 'IPv4'; value: IPv4 }
  | { type: 'IPv6'; value: IPv6 }
  | { type: 'unknown'; value: string };

export type ResponseFormat = 'text' | 'json' | 'html';
