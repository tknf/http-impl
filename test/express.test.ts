import express from "express";
import testRequest from "supertest";
import { createRequest, sendResponse } from "@tknf/http-impl/node-express";

describe("http-impl/express", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
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
