import type { CookieParseOptions, CookieSerializeOptions } from "cookie";
import { parse, serialize } from "cookie";
import type { SignFunction, UnsignFunction } from "./crypto";

export type { CookieParseOptions, CookieSerializeOptions };
export interface CookieSignatureOptions {
  secrets?: string[];
}

export interface CookieOptions extends CookieParseOptions, CookieSerializeOptions, CookieSignatureOptions {}

export class Cookie {
  private options: CookieOptions & { secrets: string[] };
  constructor(
    private sign: SignFunction,
    private unsign: UnsignFunction,
    private $name: string,
    $options: CookieOptions = {}
  ) {
    this.options = {
      secrets: [],
      path: "/",
      sameSite: "lax" as const,
      ...$options
    };
  }

  get name() {
    return this.$name;
  }

  get isSigned() {
    return this.options.secrets.length > 0;
  }

  get expires() {
    return typeof this.options.maxAge !== "undefined"
      ? new Date(Date.now() + this.options.maxAge * 1000)
      : this.options.expires;
  }

  public async parse(cookieHeader: string | null, parseOptions?: CookieParseOptions): Promise<any> {
    if (!cookieHeader) return null;
    const { secrets, ...options } = this.options;
    const cookies = parse(cookieHeader, { ...options, ...parseOptions });
    return this.name in cookies
      ? cookies[this.name] === ""
        ? ""
        : await decodeCookieValue(this.unsign, cookies[this.name], secrets)
      : null;
  }

  public async serialize(value: any, serializeOptions?: CookieSerializeOptions): Promise<string> {
    const { secrets, ...options } = this.options;
    return serialize(this.name, value === "" ? "" : await encodeCookieValue(this.sign, value, secrets), {
      ...options,
      ...serializeOptions
    });
  }
}

export type CreateCookieFunction = (name: string, options?: CookieOptions) => Cookie;

export function createCookieFactory({
  sign,
  unsign
}: {
  sign: SignFunction;
  unsign: UnsignFunction;
}): CreateCookieFunction {
  return function createCookie(name: string, cookieOptions: CookieOptions = {}) {
    return new Cookie(sign, unsign, name, cookieOptions);
  };
}

export function isCookie(object: any): object is Cookie {
  return (
    object != null &&
    typeof object.name === "string" &&
    typeof object.isSigned === "boolean" &&
    typeof object.parse === "function" &&
    typeof object.serialize === "function"
  );
}

async function encodeCookieValue(sign: SignFunction, value: any, secrets: string[]): Promise<string> {
  let encoded = encodeData(value);

  if (secrets.length > 0) {
    encoded = await sign(encoded, secrets[0]);
  }

  return encoded;
}

async function decodeCookieValue(unsign: UnsignFunction, value: string, secrets: string[]): Promise<any> {
  if (secrets.length > 0) {
    for (const secret of secrets) {
      const unsignedValue = await unsign(value, secret);
      if (unsignedValue !== false) {
        return decodeData(unsignedValue);
      }
    }

    return null;
  }

  return decodeData(value);
}

function encodeData(value: any): string {
  return btoa(myUnescape(encodeURIComponent(JSON.stringify(value))));
}

function decodeData(value: string): any {
  try {
    return JSON.parse(decodeURIComponent(myEscape(atob(value))));
  } catch (error) {
    return {};
  }
}

function myEscape(value: string): string {
  const str = value.toString();
  let result = "";
  let index = 0;
  let chr, code;
  while (index < str.length) {
    chr = str.charAt(index++);
    if (/[\w*+\-./@]/.exec(chr)) {
      result += chr;
    } else {
      code = chr.charCodeAt(0);
      if (code < 256) {
        result += `%${hex(code, 2)}`;
      } else {
        result += `%u${hex(code, 4).toUpperCase()}`;
      }
    }
  }
  return result;
}

function hex(code: number, length: number): string {
  let result = code.toString(16);
  while (result.length < length) result = `0${result}`;
  return result;
}

function myUnescape(value: string): string {
  const str = value.toString();
  let result = "";
  let index = 0;
  let chr, part;
  while (index < str.length) {
    chr = str.charAt(index++);
    if (chr === "%") {
      if (str.charAt(index) === "u") {
        part = str.slice(index + 1, index + 5);
        if (/^[\da-f]{4}$/i.exec(part)) {
          result += String.fromCharCode(parseInt(part, 16));
          index += 5;
          continue;
        }
      } else {
        part = str.slice(index, index + 2);
        if (/^[\da-f]{2}$/i.exec(part)) {
          result += String.fromCharCode(parseInt(part, 16));
          index += 2;
          continue;
        }
      }
    }
    result += chr;
  }
  return result;
}
