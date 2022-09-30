import type * as http from "http";
import { PassThrough } from "stream";
import type * as express from "express";
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

export function createRequest(
  request: http.IncomingMessage | express.Request,
  response: http.ServerResponse | express.Response
): NodeRequest {
  let origin: string;
  if (isExpressRequest(request)) {
    origin = `${request.protocol}://${request.get("host")}`;
  } else {
    // @ts-ignore
    origin = request.originalUrl ?? request.url;
  }
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
    if (isExpressRequest(request)) {
      init.body = request.pipe(new PassThrough({ highWaterMark: 16384 }));
    } else {
      init.body = request;
    }
  }

  return new NodeRequest(url.href, init);
}

export async function sendResponse(
  response: http.ServerResponse | express.Response,
  nodeResponse: NodeResponse
): Promise<void> {
  if (isExpressResponse(response)) {
    response.statusMessage = nodeResponse.statusText;
    response.status(nodeResponse.status);
  } else {
    response.statusMessage = nodeResponse.statusText;
    response.statusCode = nodeResponse.status;
  }

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

function isExpressRequest(req: any): req is express.Request {
  return req != null && typeof req.get === "function" && typeof req.app === "object";
}

function isExpressResponse(res: any): res is express.Response {
  return (
    res != null &&
    typeof res.json === "function" &&
    typeof res.redirect === "function" &&
    typeof res.status === "function"
  );
}
