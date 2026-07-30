import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { signCallback } from "../lib/integrations/callback.ts";

test("callback signature matches the documented timestamp.body contract", async () => {
  const timestamp = "1785380400";
  const body = JSON.stringify({ event: "audit.completed", auditId: "audit-1" });
  const secret = "callback-test-secret";
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  assert.equal(await signCallback(secret, timestamp, body), `sha256=${expected}`);
});
