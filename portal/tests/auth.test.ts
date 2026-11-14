import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeSession, encodeSession } from "../src/lib/auth";

describe("signed portal session", () => {
  it("round-trips staff role with HMAC", () => {
    process.env.PORTAL_SESSION_SECRET = "unit-test-portal-secret!!";
    const token = encodeSession(
      { email: "lms@solo-pr.ru", role: "staff", name: "LMS Staff" },
      1_700_000_000,
    );
    assert.ok(token.includes("."));
    const user = decodeSession(token, 1_700_000_000);
    assert.equal(user?.role, "staff");
    assert.equal(user?.email, "lms@solo-pr.ru");
  });

  it("rejects unsigned base64 role forgery", () => {
    process.env.PORTAL_SESSION_SECRET = "unit-test-portal-secret!!";
    const forged = Buffer.from(
      JSON.stringify({ email: "attacker@example.com", role: "staff", name: "x", exp: 9e12, iat: 1 }),
      "utf8",
    ).toString("base64url");
    assert.equal(decodeSession(forged), null);
    assert.equal(decodeSession(`${forged}.fakesig`), null);
  });

  it("rejects tampered payload with valid-looking shape", () => {
    process.env.PORTAL_SESSION_SECRET = "unit-test-portal-secret!!";
    const token = encodeSession(
      { email: "learner@solo-pr.ru", role: "learner", name: "Ученик" },
      1_700_000_000,
    );
    const [payload, sig] = token.split(".");
    const evil = Buffer.from(
      JSON.stringify({ email: "learner@solo-pr.ru", role: "staff", name: "Ученик", exp: 9e12, iat: 1 }),
      "utf8",
    ).toString("base64url");
    assert.equal(decodeSession(`${evil}.${sig}`), null);
    assert.ok(decodeSession(`${payload}.${sig}`, 1_700_000_000));
  });

  it("rejects expired sessions", () => {
    process.env.PORTAL_SESSION_SECRET = "unit-test-portal-secret!!";
    const token = encodeSession(
      { email: "lms@solo-pr.ru", role: "staff", name: "LMS Staff" },
      1_700_000_000,
    );
    assert.equal(decodeSession(token, 1_700_000_000 + 60 * 60 * 13), null);
  });
});
