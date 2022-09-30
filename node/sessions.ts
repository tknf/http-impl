import * as crypto from "node:crypto";
import { promises as fsp } from "node:fs";
import * as path from "node:path";
import {
  SessionStorage,
  SessionIdStorageStrategy,
  createCookieSessionStorageFactory,
  createSessionStorageFactory,
  createMemorySessionStorageFactory
} from "@tknf/http-impl/_runtime";
import { createCookie } from "./cookies";

interface FileSessionStorageOptions {
  /**
   * The Cookie used to store the session id on the client, or options used
   * to automatically create one.
   */
  cookie?: SessionIdStorageStrategy["cookie"];

  /**
   * The directory to use to store session files.
   */
  dir: string;
}

/**
 * Creates a SessionStorage that stores session data on a filesystem.
 *
 * The advantage of using this instead of cookie session storage is that
 * files may contain much more data than cookies.
 *
 * @see https://remix.run/api/remix#createfilesessionstorage-node
 */
export function createFileSessionStorage({ cookie, dir }: FileSessionStorageOptions): SessionStorage {
  return createSessionStorage({
    cookie,
    async createData(data, expires) {
      const content = JSON.stringify({ data, expires });

      // eslint-disable-next-line
      while (true) {
        // TODO: Once node v16 is available on AWS we should use the webcrypto
        // API's crypto.getRandomValues() function here instead.
        const randomBytes = crypto.randomBytes(8);
        // This storage manages an id space of 2^64 ids, which is far greater
        // than the maximum number of files allowed on an NTFS or ext4 volume
        // (2^32). However, the larger id space should help to avoid collisions
        // with existing ids when creating new sessions, which speeds things up.
        const id = Buffer.from(randomBytes).toString("hex");

        try {
          const file = getFile(dir, id);
          await fsp.mkdir(path.dirname(file), { recursive: true });
          await fsp.writeFile(file, content, { encoding: "utf-8", flag: "wx" });
          return id;
        } catch (error: any) {
          if (error.code !== "EEXIST") throw error;
        }
      }
    },
    async readData(id) {
      try {
        const file = getFile(dir, id);
        const content = JSON.parse(await fsp.readFile(file, "utf-8"));
        const data = content.data;
        const expires = typeof content.expires === "string" ? new Date(content.expires) : null;

        if (!expires || expires > new Date()) {
          return data;
        }

        // Remove expired session data.
        if (expires) await fsp.unlink(file);

        return null;
      } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
        return null;
      }
    },
    async updateData(id, data, expires) {
      const content = JSON.stringify({ data, expires });
      const file = getFile(dir, id);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      await fsp.writeFile(file, content, "utf-8");
    },
    async deleteData(id) {
      // Return early if the id is empty, otherwise we'll end up trying to
      // unlink the dir, which will cause the EPERM error.
      if (!id) {
        return;
      }
      try {
        await fsp.unlink(getFile(dir, id));
      } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  });
}

function getFile(dir: string, id: string): string {
  // Divide the session id up into a directory (first 2 bytes) and filename
  // (remaining 6 bytes) to reduce the chance of having very large directories,
  // which should speed up file access. This is a maximum of 2^16 directories,
  // each with 2^48 files.
  return path.join(dir, id.slice(0, 4), id.slice(4));
}

export const createCookieSessionStorage = createCookieSessionStorageFactory(createCookie);
export const createSessionStorage = createSessionStorageFactory(createCookie);
export const createMemorySessionStorage = createMemorySessionStorageFactory(createSessionStorage);