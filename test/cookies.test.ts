import { createCookieFactory, isCookie, SignFunction, UnsignFunction } from "../_runtime";

const sign: SignFunction = async (value, secret) => {
  return JSON.stringify({ value, secret });
};
const unsign: UnsignFunction = async (signed, secret) => {
  try {
    const unsigned = JSON.parse(signed);
    if (unsigned.secret !== secret) return false;
    return unsigned.value;
  } catch (e: unknown) {
    return false;
  }
};

const createCookie = createCookieFactory({ sign, unsign });

function getCookieFromSetCookie(setCookie: string): string {
  return setCookie.split(/;\s*/)[0];
}

describe("http-impl/cookies", () => {
  describe("isCookie", () => {
    test("Should returns true for Cookie objects", () => {
      expect(isCookie(createCookie("my-cookie"))).toBe(true);
    });

    test("Should returns false for non-Cookie objects", () => {
      expect(isCookie({})).toBe(false);
      expect(isCookie([])).toBe(false);
      expect(isCookie("")).toBe(false);
      expect(isCookie(true)).toBe(false);
    });
  });

  describe("cookies", () => {
    test("parse/serialize empty string values", async () => {
      const cookie = createCookie("my-cookie");
      const setCookie = await cookie.serialize("");
      const value = await cookie.parse(getCookieFromSetCookie(setCookie));

      expect(value).toMatchInlineSnapshot(`""`);
    });

    test("parse/serialize unsigned string values", async () => {
      const cookie = createCookie("my-cookie");
      const setCookie = await cookie.serialize("hello world");
      const value = await cookie.parse(getCookieFromSetCookie(setCookie));

      expect(value).toEqual("hello world");
    });

    test("parse/serialize signed string values", async () => {
      const cookie = createCookie("my-cookie", {
        secrets: ["secret1"]
      });
      const setCookie = await cookie.serialize("hello world");
      const value = await cookie.parse(getCookieFromSetCookie(setCookie));

      expect(value).toMatchInlineSnapshot(`"hello world"`);
    });

    test("parse/serialize string values containing utf8 characters", async () => {
      const cookie = createCookie("my-cookie");
      const setCookie = await cookie.serialize("日本語");
      const value = await cookie.parse(getCookieFromSetCookie(setCookie));

      expect(value).toBe("日本語");
    });

    test("fails to parses signed string values with invalid signature", async () => {
      const cookie = createCookie("my-cookie", {
        secrets: ["secret1"]
      });
      const setCookie = await cookie.serialize("hello michael");
      const cookie2 = createCookie("my-cookie", {
        secrets: ["secret2"]
      });
      const value = await cookie2.parse(getCookieFromSetCookie(setCookie));

      expect(value).toBe(null);
    });

    test("parses/serializes signed object values", async () => {
      const cookie = createCookie("my-cookie", {
        secrets: ["secret1"]
      });
      const setCookie = await cookie.serialize({ hello: "mjackson" });
      const value = await cookie.parse(getCookieFromSetCookie(setCookie));

      expect(value).toMatchInlineSnapshot(`
        {
          "hello": "mjackson",
        }
      `);
    });

    test("fails to parse signed object values with invalid signature", async () => {
      const cookie = createCookie("my-cookie", {
        secrets: ["secret1"]
      });
      const setCookie = await cookie.serialize({ hello: "mjackson" });
      const cookie2 = createCookie("my-cookie", {
        secrets: ["secret2"]
      });
      const value = await cookie2.parse(getCookieFromSetCookie(setCookie));

      expect(value).toBeNull();
    });

    test("supports secret rotation", async () => {
      let cookie = createCookie("my-cookie", {
        secrets: ["secret1"]
      });
      const setCookie = await cookie.serialize({ hello: "mjackson" });
      const value = await cookie.parse(getCookieFromSetCookie(setCookie));

      expect(value).toMatchInlineSnapshot(`
        {
          "hello": "mjackson",
        }
      `);

      // A new secret enters the rotation...
      cookie = createCookie("my-cookie", {
        secrets: ["secret2", "secret1"]
      });

      // cookie should still be able to parse old cookies.
      const oldValue = await cookie.parse(getCookieFromSetCookie(setCookie));
      expect(oldValue).toMatchObject(value);

      // New Set-Cookie should be different, it uses a differet secret.
      const setCookie2 = await cookie.serialize(value);
      expect(setCookie).not.toEqual(setCookie2);
    });

    test("makes the default path of cookies to be /", async () => {
      const cookie = createCookie("my-cookie");

      const setCookie = await cookie.serialize("hello world");
      expect(setCookie).toContain("Path=/");

      const cookie2 = createCookie("my-cookie2");

      const setCookie2 = await cookie2.serialize("hello world", {
        path: "/about"
      });
      expect(setCookie2).toContain("Path=/about");
    });
  });
});
