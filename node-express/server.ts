import { PassThrough } from "stream";
import type * as express from "express";
import type { RequestInit as NodeRequestInit, Response as NodeResponse } from "@tknf/node-globals";
import {
  AbortController,
  writeReadableStreamToWritable,
  Headers as NodeHeaders,
  Request as NodeRequest
} from "@tknf/node-globals";

export function createHeaders(requestHeaders: express.Request["headers"]): NodeHeaders {
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

export function createRequest(request: express.Request, response: express.Response): NodeRequest {
  const origin = `${request.protocol}://${request.get("host")}`;
  const url = new URL(origin);
  const controller = new AbortController();

  response.on("close", () => controller.abort());

  const init: NodeRequestInit = {
    method: request.method,
    headers: createHeaders(request.headers),
    signal: controller.signal as NodeRequestInit["signal"]
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.pipe(new PassThrough({ highWaterMark: 16384 }));
  }

  return new NodeRequest(url.href, init);
}

export async function sendResponse(response: express.Response, nodeResponse: NodeResponse): Promise<void> {
  response.statusMessage = nodeResponse.statusText;
  response.status(nodeResponse.status);

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
