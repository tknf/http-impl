import type * as http from "http";
import { installGlobals } from "@tknf/node-globals";
installGlobals();

declare global {
  var __raw: {
    request: http.IncomingMessage;
    headers: http.IncomingMessage["headers"];
    response: http.ServerResponse;
  };
}
