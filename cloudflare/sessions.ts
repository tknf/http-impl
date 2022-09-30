import {
  SessionStorage,
  SessionIdStorageStrategy,
  createCookieSessionStorageFactory,
  createSessionStorageFactory,
  createMemorySessionStorageFactory
} from "@tknf/http-impl/_runtime";
import { createCookie } from "./cookies";

export const createCookieSessionStorage = createCookieSessionStorageFactory(createCookie);
export const createSessionStorage = createSessionStorageFactory(createCookie);
export const createMemorySessionStorage = createMemorySessionStorageFactory(createSessionStorage);

interface CloudflareKVSessionStorageOptions {
  /**
   * The Cookie used to store the session id on the client, or options used
   * to automatically create one.
   */
  cookie?: SessionIdStorageStrategy["cookie"];

  /**
   * The KVNamespace used to store the sessions.
   */
  kv: KVNamespace;
}

/**
 * Creates a SessionStorage that stores session data in the Clouldflare KV Store.
 *
 * The advantage of using this instead of cookie session storage is that
 * KV Store may contain much more data than cookies.
 */
export function createCloudflareKVSessionStorage({ cookie, kv }: CloudflareKVSessionStorageOptions): SessionStorage {
  return createSessionStorage({
    cookie,
    async createData(data, expires) {
      // eslint-disable-next-line
      while (true) {
        const randomBytes = new Uint8Array(8);
        crypto.getRandomValues(randomBytes);
        // This storage manages an id space of 2^64 ids, which is far greater
        // than the maximum number of files allowed on an NTFS or ext4 volume
        // (2^32). However, the larger id space should help to avoid collisions
        // with existing ids when creating new sessions, which speeds things up.
        const id = [...randomBytes].map((x) => x.toString(16).padStart(2, "0")).join("");

        if (await kv.get(id, "json")) {
          continue;
        }

        await kv.put(id, JSON.stringify(data), {
          expiration: expires ? Math.round(expires.getTime() / 1000) : undefined
        });

        return id;
      }
    },
    async readData(id) {
      const session = await kv.get(id);

      if (!session) {
        return null;
      }

      return JSON.parse(session);
    },
    async updateData(id, data, expires) {
      await kv.put(id, JSON.stringify(data), {
        expiration: expires ? Math.round(expires.getTime() / 1000) : undefined
      });
    },
    async deleteData(id) {
      await kv.delete(id);
    }
  });
}
