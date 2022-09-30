// @ts-ignore
import { streamMultipart } from "@web3-storage/multipart-parser";

export type UploadHandlerPart = {
  name: string;
  filename?: string;
  contentType: string;
  data: AsyncIterable<Uint8Array>;
};

export type UploadHandler = (part: UploadHandlerPart) => Promise<File | string | null | undefined>;

export function composeUploadHandlers(...handlers: UploadHandler[]): UploadHandler {
  return async (part) => {
    for (const handler of handlers) {
      const value = await handler(part);
      if (typeof value !== "undefined" && value !== null) {
        return value;
      }
    }

    return undefined;
  };
}

/**
 * Allows you to handle multipart forms (file uploads) for your app.
 *
 * TODO: Update this comment
 * @see https://remix.run/api/remix#parsemultipartformdata-node
 */
export async function parseMultipartFormData(request: Request, uploadHandler: UploadHandler): Promise<FormData> {
  const contentType = request.headers.get("Content-Type") || "";
  const [type, boundary] = contentType.split(/\s*;\s*boundary=/);

  if (!request.body || !boundary || type !== "multipart/form-data") {
    throw new TypeError("Could not parse content as FormData.");
  }

  const formData = new FormData();
  const parts: AsyncIterable<UploadHandlerPart & { done?: true }> = streamMultipart(request.body, boundary);

  for await (const part of parts) {
    if (part.done) break;

    if (typeof part.filename === "string") {
      // only pass basename as the multipart/form-data spec recommends
      // https://datatracker.ietf.org/doc/html/rfc7578#section-4.2
      part.filename = part.filename.split(/[/\\]/).pop();
    }

    const value = await uploadHandler(part);
    if (typeof value !== "undefined" && value !== null) {
      formData.append(part.name, value as any);
    }
  }

  return formData;
}
