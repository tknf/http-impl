import cookieSignature from "cookie-signature";

export async function sign(value: any, secret: string) {
  return cookieSignature.sign(value, secret);
}

export async function unsign(signed: string, secret: string) {
  return cookieSignature.unsign(signed, secret);
}
