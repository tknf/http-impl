import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { RequestInit as NodeRequestInit, Response as NodeResponse } from "@tknf/node-globals";
import {
  AbortController,
  writeReadableStreamToWritable,
  Headers as NodeHeaders,
  Request as NodeRequest
} from "@tknf/node-globals";

export function createHeaders(requestHeaders: VercelRequest["headers"]): NodeHeaders {
  const headers = new NodeHeaders();

  for (const key in requestHeaders) {
    const header = requestHeaders[key]!;
    if (Array.isArray(header)) {
      for (const value of header) {
        headers.append(key, value);
      }
    } else {
      headers.append(key, header);
    }
  }

  return headers;
}

export function createRequest(request: VercelRequest, response: VercelResponse): NodeRequest {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const url = new URL(request.url!, `${protocol}://${host}`);
  const controller = new AbortController();
  response.on("close", () => controller.abort());

  const init: NodeRequestInit = {
    method: request.method,
    headers: createHeaders(request.headers),
    signal: controller.signal as NodeRequestInit["signal"]
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request;
  }

  return new NodeRequest(url.href, init);
}

export async function sendResponse(response: VercelResponse, nodeResponse: NodeResponse): Promise<void> {
  response.statusMessage = nodeResponse.statusText;
  const multiValueHeaders = nodeResponse.headers.raw();
  response.writeHead(nodeResponse.status, nodeResponse.statusText, multiValueHeaders);

  if (nodeResponse.body) {
    await writeReadableStreamToWritable(nodeResponse.body, response);
  } else {
    response.end();
  }
}
