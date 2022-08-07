import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import type {
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@tknf/node-globals";
import {
  readableStreamToString,
  Headers as NodeHeaders,
  Request as NodeRequest,
} from "@tknf/node-globals";
import { isBinaryType } from "./binary-types";

export function createHeaders(
  requestHeaders: HandlerEvent["multiValueHeaders"]
): NodeHeaders {
  const headers = new NodeHeaders();

  for (const [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      for (const value of values) {
        headers.append(key, value);
      }
    }
  }

  return headers;
}

export function createRequest(event: HandlerEvent): NodeRequest {
  let url: URL;
  if (process.env.NODE_ENV !== "development") {
    url = new URL(event.rawUrl);
  } else {
    let origin = event.headers.host;
    let rawPath = getRawPath(event);
    url = new URL(rawPath, `http://${origin}`);
  }

  const init: NodeRequestInit = {
    method: event.httpMethod,
    headers: createHeaders(event.multiValueHeaders),
  };

  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD" && event.body) {
    const isFormData = event.headers["content-type"]?.includes(
      "multipart/form-data"
    );
    init.body = event.isBase64Encoded
      ? isFormData
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body, "base64").toString()
      : event.body;
  }

  return new NodeRequest(url.href, init);
}

function getRawPath(event: HandlerEvent) {
  let rawPath = event.path;
  let searchParams = new URLSearchParams();

  if (!event.multiValueQueryStringParameters) {
    return rawPath;
  }

  let paramKeys = Object.keys(event.multiValueQueryStringParameters);
  for (const key of paramKeys) {
    const values = event.multiValueQueryStringParameters[key];
    if (!values) continue;
    for (const value of values) {
      searchParams.append(key, value);
    }
  }

  const rawParams = searchParams.toString();
  if (rawParams) rawPath += `?${rawParams}`;
  return rawPath;
}

export async function sendResponse(
  nodeResponse: NodeResponse
): Promise<HandlerResponse> {
  const contentType = nodeResponse.headers.get("Content-Type");
  let body: string | undefined;
  const isBase64Encoded = isBinaryType(contentType);

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, "base64");
    } else {
      body = await nodeResponse.text();
    }
  }

  const multiValueHeaders = nodeResponse.headers.raw();

  return {
    statusCode: nodeResponse.status,
    multiValueHeaders,
    body,
    isBase64Encoded,
  };
}
