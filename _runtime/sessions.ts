import type { CookieParseOptions, CookieSerializeOptions } from "cookie";
import { Cookie, CookieOptions, CreateCookieFunction, isCookie } from "./cookies";
import { warnOnce } from "./log";

export interface SessionData {
  [name: string]: any;
}

function flash(name: string): string {
  return `__flash_${name}`;
}

export type CreateSessionFunction = (initialData?: SessionData, id?: string) => Session;

export class Session {
  private map: Map<string, any>;

  constructor(initialData: SessionData = {}, private $id: string = "") {
    this.map = new Map(Object.entries(initialData));
  }

  get id() {
    return this.$id;
  }

  get data() {
    return Object.fromEntries(this.map);
  }

  public has(name: string) {
    return this.map.has(name) || this.map.has(flash(name));
  }

  public get(name: string) {
    if (this.map.has(name)) {
      return this.map.get(name);
    }

    const flashName = flash(name);
    if (this.map.has(flashName)) {
      const value = this.map.get(flashName);
      this.map.delete(flashName);
      return value;
    }

    return undefined;
  }

  public set(name: string, value: any) {
    this.map.set(name, value);
  }

  public flash(name: string, value: any) {
    this.map.set(flash(name), value);
  }

  public unset(name: string) {
    this.map.delete(name);
  }
}

/**
 * SessionStorage stores session data between HTTP requests and knows how to
 * parse and create cookies.
 *
 * A SessionStorage creates Session objects using a `Cookie` header as input.
 * Then, later it generates the `Set-Cookie` header to be used in the response.
 */
export abstract class SessionStorageContract {
  /**
   * Parses a Cookie header from a HTTP request and returns the associated
   * Session. If there is no session associated with the cookie, this will
   * return a new Session with no data.
   */
  public abstract getSession(cookieHeader?: string | null, options?: CookieParseOptions): Promise<Session>;

  /**
   * Stores all data in the Session and returns the Set-Cookie header to be
   * used in the HTTP response.
   */
  public abstract commitSession(session: Session, options?: CookieSerializeOptions): Promise<string>;

  /**
   * Deletes all data associated with the Session and returns the Set-Cookie
   * header to be used in the HTTP response.
   */
  public abstract destroySession(session: Session, options?: CookieSerializeOptions): Promise<string>;
}

export class SessionStorage extends SessionStorageContract {
  constructor(private cookie: Cookie, private strategy: SessionIdStorageStrategy) {
    super();
  }

  /**
   * Parses a Cookie header from a HTTP request and returns the associated
   * Session. If there is no session associated with the cookie, this will
   * return a new Session with no data.
   */
  public async getSession(cookieHeader?: string | null, options?: CookieParseOptions): Promise<Session> {
    const id = cookieHeader && (await this.cookie.parse(cookieHeader, options));
    const data = id && (await this.strategy.readData(id));
    return new Session(data || {}, id || "");
  }

  /**
   * Stores all data in the Session and returns the Set-Cookie header to be
   * used in the HTTP response.
   */
  public async commitSession(session: Session, options?: CookieSerializeOptions): Promise<string> {
    let id = session.id;
    const data = session.data;

    if (id) {
      await this.strategy.updateData(id, data, this.cookie.expires);
    } else {
      id = await this.strategy.createData(data, this.cookie.expires);
    }

    return this.cookie.serialize(id, options);
  }

  /**
   * Deletes all data associated with the Session and returns the Set-Cookie
   * header to be used in the HTTP response.
   */
  public async destroySession(session: Session, options?: CookieSerializeOptions): Promise<string> {
    await this.strategy.deleteData(session.id);
    return this.cookie.serialize("", {
      ...options,
      expires: new Date(0)
    });
  }
}

/**
 * SessionIdStorageStrategy is designed to allow anyone to easily build their
 * own SessionStorage using `createSessionStorage(strategy)`.
 *
 * This strategy describes a common scenario where the session id is stored in
 * a cookie but the actual session data is stored elsewhere, usually in a
 * database or on disk. A set of create, read, update, and delete operations
 * are provided for managing the session data.
 */
export interface SessionIdStorageStrategy {
  /**
   * The Cookie used to store the session id, or options used to automatically
   * create one.
   */
  cookie?: Cookie | (CookieOptions & { name?: string });

  /**
   * Creates a new record with the given data and returns the session id.
   */
  createData: (data: SessionData, expires?: Date) => Promise<string>;

  /**
   * Returns data for a given session id, or `null` if there isn't any.
   */
  readData: (id: string) => Promise<SessionData | null>;

  /**
   * Updates data for the given session id.
   */
  updateData: (id: string, data: SessionData, expires?: Date) => Promise<void>;

  /**
   * Deletes data for a given session id from the data store.
   */
  deleteData: (id: string) => Promise<void>;
}

export type CreateSessionStorageFunction = (strategy: SessionIdStorageStrategy) => SessionStorage;

export function createSessionStorageFactory(createCookie: CreateCookieFunction): CreateSessionStorageFunction {
  return function createSessionStorage(strategy: SessionIdStorageStrategy) {
    const cookie = isCookie(strategy.cookie)
      ? strategy.cookie
      : createCookie(strategy.cookie?.name || "__sessionid", strategy.cookie);

    warnOnceAboutSigningSessionCookie(cookie);

    return new SessionStorage(cookie, strategy);
  };
}

export type CreateCookieSessionStorageFunction = (options?: {
  cookie?: SessionIdStorageStrategy["cookie"];
}) => CookieSessionStorage;

class CookieSessionStorage extends SessionStorageContract {
  constructor(private cookie: Cookie) {
    super();
  }

  public async getSession(
    cookieHeader?: string | null | undefined,
    options?: CookieParseOptions | undefined
  ): Promise<Session> {
    return new Session((cookieHeader && (await this.cookie.parse(cookieHeader, options))) || {});
  }

  public async commitSession(session: Session, options?: CookieSerializeOptions | undefined): Promise<string> {
    const serializedCookie = await this.cookie.serialize(session.data, options);
    if (serializedCookie.length > 4096) {
      throw new Error(`Cookie length will exceed browser maximum. Length: ${serializedCookie.length}`);
    }
    return serializedCookie;
  }

  public async destroySession(_session: Session, options?: CookieSerializeOptions | undefined): Promise<string> {
    return this.cookie.serialize("", { ...options, expires: new Date(0) });
  }
}

export function createCookieSessionStorageFactory(
  createCookie: CreateCookieFunction
): CreateCookieSessionStorageFunction {
  return function createCookieSessionStorage({ cookie: cookieArg } = {}) {
    const cookie = isCookie(cookieArg) ? cookieArg : createCookie(cookieArg?.name || "__sessionid", cookieArg);

    warnOnceAboutSigningSessionCookie(cookie);

    return new CookieSessionStorage(cookie);
  };
}

export type CreateMemorySessionStorageFunction = (options?: {
  cookie?: SessionIdStorageStrategy["cookie"];
}) => SessionStorage;

export function createMemorySessionStorageFactory(
  createSessionStorage: CreateSessionStorageFunction
): CreateMemorySessionStorageFunction {
  return function createMemorySessionStorage({ cookie } = {}) {
    let uniqueId = 0;
    const map = new Map<string, { data: SessionData; expires?: Date }>();

    return createSessionStorage({
      cookie,
      async createData(data, expires) {
        const id = (++uniqueId).toString();
        map.set(id, { data, expires });
        return id;
      },
      async readData(id) {
        if (map.has(id)) {
          const { data, expires } = map.get(id)!;
          if (!expires || expires > new Date()) {
            return data;
          }

          if (expires) map.delete(id);
        }

        return null;
      },
      async updateData(id, data, expires) {
        map.set(id, { data, expires });
      },
      async deleteData(id) {
        map.delete(id);
      }
    });
  };
}

export function isSession(session: any): session is Session {
  return (
    session != null &&
    typeof session.id === "string" &&
    typeof session.data === "object" &&
    typeof session.has === "function" &&
    typeof session.get === "function" &&
    typeof session.set === "function" &&
    typeof session.flash === "function" &&
    typeof session.unset === "function"
  );
}

function warnOnceAboutSigningSessionCookie(cookie: Cookie) {
  warnOnce(
    cookie.isSigned,
    `The "${cookie.name}" cookie is not signed, but session cookies should be ` +
      `signed to prevent tampering on the client before they are sent back to the ` +
      `server. See https://remix.run/api/remix#signing-cookies ` +
      `for more information.`
  );
}
