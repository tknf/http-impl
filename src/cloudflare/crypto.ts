const encoder = new TextEncoder();

export async function sign(value: string, secret: string) {
  const key = await createKey(secret, ["sign"]);
  const data = encoder.encode(value);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const hash = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(
    /=+$/,
    ""
  );

  return value + "." + hash;
}

export async function unsign(singed: string, secret: string) {
  const index = singed.lastIndexOf(".");
  const value = singed.slice(0, index);
  const hash = singed.slice(index + 1);
  const key = await createKey(secret, ["verify"]);
  const data = encoder.encode(value);
  const signature = byteStringToUnit8Array(atob(hash));
  const valid = await crypto.subtle.verify("HMAC", key, signature, data);

  return valid ? value : false;
}

async function createKey(
  secret: string,
  usages: CryptoKey["usages"]
): Promise<CryptoKey> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );

  return key;
}

function byteStringToUnit8Array(byteString: string): Uint8Array {
  const array = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    array[i] = byteString.charCodeAt(i);
  }

  return array;
}
