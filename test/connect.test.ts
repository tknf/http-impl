import connect from "connect";
import testRequest from "supertest";
import { createRequest, sendResponse } from "@tknf/http-impl/node-connect";

describe("http-impl/connect", () => {
  let app: connect.Server;

  beforeEach(() => {
    app = connect();
    app.use("/", (req, res) => {
      const request = createRequest(req, res);
      const url = new URL(request.url);
      const response = new Response(url.pathname, { status: 200 });
      sendResponse(res, response as any);
    });
  });

  test("Should response the GET method", (done) => {
    testRequest(app)
      .get("/")
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe("/");
        done();
      });
  });
});
