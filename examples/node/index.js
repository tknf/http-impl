const connect = require("connect");
const { createRequest, sendResponse, createCookieSessionStorage } = require("@tknf/http-impl/node-connect");

const server = connect();

const { getSession, commitSession } = createCookieSessionStorage({
  cookie: { secrets: ["secret1"] }
});

server.use(async (req, res, next) => {
  try {
    const request = createRequest(req, res);

    const session = await getSession(request.headers.get("Cookie"));
    session.set("foo", "bar");
    const response = new Response(`${request.url}`, {
      headers: {
        "Set-Cookie": await commitSession(session)
      }
    });
    return sendResponse(res, response);
  } catch (err) {
    next(err);
  }
});

server.listen(3000, () => {
  console.log(`http server listen on localhost:3000`);
});
