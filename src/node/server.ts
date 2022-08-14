import * as http from "http";
import type {
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@tknf/node-globals";
import {
  AbortController,
  writeReadableStreamToWritable,
  Headers as NodeHeaders,
  Request as NodeRequest,
} from "@tknf/node-globals";

export function createHeaders(
  requestHeaders: http.IncomingMessage["headers"]
): NodeHeaders {
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

  global.__raw.headers = requestHeaders;
  return headers;
}

export function createRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse
): NodeRequest {
  // @ts-ignore
  const orig: string = request.originalUrl ?? request.url;
  let url: URL;
  if (orig && !orig.startsWith("/")) {
    url = new URL(orig);
  } else {
    const secure = request.headers["x-forwarded-proto"] === "https";
    url = new URL(
      `${secure ? "https" : "http"}://${request.headers.host! + orig}`
    );
  }
  const controller = new AbortController();

  request.on("close", () => {
    controller.abort();
  });

  const init: NodeRequestInit = {
    method: request.method,
    headers: createHeaders(request.headers),
    signal: controller.signal as NodeRequestInit["signal"],
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request;
  }

  global.__raw.request = request;
  global.__raw.response = response;
  return new NodeRequest(url.href, init);
}

export async function sendResponse(
  response: http.ServerResponse,
  nodeResponse: NodeResponse
): Promise<void> {
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
