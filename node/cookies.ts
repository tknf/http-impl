import { createCookieFactory } from "@tknf/http-impl/_runtime";
import { sign, unsign } from "./crypto";

export const createCookie = createCookieFactory({ sign, unsign });
