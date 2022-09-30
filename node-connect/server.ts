import type * as http from "http";
import type { RequestInit as NodeRequestInit, Response as NodeResponse } from "@tknf/node-globals";
import {
  AbortController,
  writeReadableStreamToWritable,
  Headers as NodeHeaders,
  Request as NodeRequest
} from "@tknf/node-globals";

export function createHeaders(requestHeaders: http.IncomingMessage["headers"]): NodeHeaders {
  const headers = new NodeHeaders();

  for (const [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (const value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

export function createRequest(request: http.IncomingMessage, response: http.ServerResponse): NodeRequest {
  // @ts-ignore
  const origin = request.originalUrl ?? request.url;
  let url: URL;
  if (origin && !origin.startsWith("/")) {
    url = new URL(origin);
  } else {
    const secure = request.headers["x-forwarded-proto"] === "https";
    url = new URL(`${secure ? "https" : "http"}://${request.headers.host! + origin}`);
  }
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

export async function sendResponse(response: http.ServerResponse, nodeResponse: NodeResponse): Promise<void> {
  response.statusMessage = nodeResponse.statusText;
  response.statusCode = nodeResponse.status;

  for (const [key, values] of Object.entries(nodeResponse.headers.raw())) {
    for (const value of values) {
      response.setHeader(key, value);
    }
  }

  if (nodeResponse.body) {
    await writeReadableStreamToWritable(nodeResponse.body, response);
  } else {
    response.end();
  }
}
