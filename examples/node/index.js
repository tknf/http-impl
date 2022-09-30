const connect = require("connect");
const { installGlobals, createRequest, sendResponse } = require("@tknf/http-impl/node-connect");

installGlobals();

const server = connect();

server.use(async (req, res, next) => {
  try {
    const request = createRequest(req, res);
    const response = new Response(`${request.url}`);
    return sendResponse(res, response);
  } catch (err) {
    next(err);
  }
});

server.listen(3000, () => {
  console.log(`http server listen on localhost:3000`);
});
