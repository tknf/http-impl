# @tknf/http-impl

Implementations of the web standard HTTP Request and Response.

To get started, open a new shell and run:
```bash
npm install --save @tknf/http-impl
# or
yarn add @tknf/http-impl
```

## Getting started with Node.js
```js
const http = require("http");
const { createRequest, sendResponse } = require("@tknf/http-impl/node");

const server = http.createServer((req, res) => {
  const request = createRequest(req);
  const response = new Response("<div>Hello world!</div>", {
    headers: {
      "Content-Type": "text/html;charset=utf-8"
    }
  });
  await sendResponse(res, response);
});

server.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});
