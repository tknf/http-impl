const connect = require("connect");
const { createRequest, sendResponse } = require("@tknf/http-impl/node-connect");

const server = connect();

server.use(async (req, res, next) => {
  try {
    const request = createRequest(req, res);
    console.log(request.url);
    const response = new Response(`${request.url}`);
    return sendResponse(res, response);
  } catch (err) {
    next(err);
  }
});

server.listen(3000, () => {
  console.log(`http server listen on localhost:3000`);
});
