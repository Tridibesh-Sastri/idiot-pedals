import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Verification-flow hardening: per-email cooldown, resend endpoint, mail
 * hardening, password byte rule, address validation.
 *
 * Same harness shape as the other HTTP suites (own process, own rate-limiter
 * budgets, own database): register/verify/resend are public endpoints, so no
 * auth fixtures are needed. HTTP budgets per file process: at most 5 register
 * POSTs and 5 resend POSTs here (the per-IP limiter allows 5 each) — pure
 * unit tests cover everything count-shaped beyond that.
 *
 *   node --test --test-concurrency=1 tests/registrationHardening.test.js
 */

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";
import mongoose from "mongoose";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import app from "../src/app/app.js";
import config from "../src/config/config.js";
import pendingRegistrationModel from "../src/models/pendingRegistration.js";
import { verificationSendDecision } from "../src/controllers/auth.controller.js";
import { sendVerificationEmail } from "../src/services/email.service.js";
import { validateAddressItem } from "../src/validators/auth.validator.js";
import {
  clearSentMessages,
  getSentMessagesOfKind,
} from "../src/services/mailer.service.js";

void fakeRazorpay;

const TEST_DB = "idiot-pedals-test";

const testMongoUri = (() => {
  const [base, query = ""] = config.MONGO_URI.split("?");
  const lastSlash = base.lastIndexOf("/");
  const withDb = base.slice(0, lastSlash + 1) + TEST_DB;
  return query ? `${withDb}?${query}` : withDb;
})();

let server;
let baseUrl;

const apiFetch = async (path, { method = "GET", body } = {}) => {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, json, text };
};

const verifyPost = (token) =>
  apiFetch("/api/auth/verify-email", { method: "POST", body: { token } });
let emailCounter = 0;
const registerBody = (overrides = {}) => {
  emailCounter += 1;
  // Unique valid Indian mobile per call: verified users keep their number
  // (phone is uniquely indexed), so reuse across tests would collide.
  const phone = String(9000000000 + emailCounter);
  return {
    name: "Cooldown Tester",
    email: `cooldown-${Date.now()}-${emailCounter}@mailhost.test`,
    phone,
    password: "Correct#12345",
    addresses: [
      {
        label: "Home",
        name: "Cooldown Tester",
        phone: "9876543210",
        addressLine1: "1 Test Street",
        city: "Kolkata",
        state: "West Bengal",
        postalCode: "700001",
        country: "India",
      },
    ],
    ...overrides,
  };
};

const extractToken = (text) => {
  const match = String(text ?? "").match(/verify-email\?token=([a-f0-9]{64})/i);
  assert.ok(match, "no verification token in the recorded mail");
  return match[1];
};

before(async () => {
  await mongoose.connect(testMongoUri);
  await mongoose.connection.dropDatabase();

  await Promise.all([pendingRegistrationModel.init()]);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

/* ========================================================================== */
/* 1. Per-email cooldown on register                                            */
/* ========================================================================== */

describe("register cooldown", () => {
  test("re-register inside the cooldown sends no mail and keeps the old token valid", async () => {
    clearSentMessages();
    const body = registerBody();

    const first = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });
    assert.equal(first.status, 200, first.text);
    assert.equal(first.json.retryAfterSeconds, undefined);

    const second = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });
    assert.equal(second.status, 200, second.text);
    assert.ok(
      second.json.retryAfterSeconds > 0 && second.json.retryAfterSeconds <= 60,
      `expected a retry countdown, got ${JSON.stringify(second.json)}`,
    );

    // Exactly one verification mail went out, for the first attempt.
    const mails = getSentMessagesOfKind("email-verification");
    assert.equal(mails.length, 1);

    // The earlier link still verifies: nothing was rotated.
    const token = extractToken(mails[0].text);
    const verified = await verifyPost(token);
    assert.equal(verified.status, 200, verified.text);
  });

  test("outside the cooldown the token rotates and the old link dies", async () => {
    clearSentMessages();
    const body = registerBody();

    const first = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });
    assert.equal(first.status, 200, first.text);

    const firstMail = getSentMessagesOfKind("email-verification")[0];
    const oldToken = extractToken(firstMail.text);

    // Move past the cooldown without waiting for it.
    await pendingRegistrationModel.updateOne(
      { email: body.email.toLowerCase() },
      { $set: { lastVerificationSentAt: new Date(Date.now() - 61_000) } },
    );

    const second = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });
    assert.equal(second.status, 200, second.text);
    assert.equal(second.json.retryAfterSeconds, undefined);

    const mails = getSentMessagesOfKind("email-verification");
    assert.equal(mails.length, 2);
    const newToken = extractToken(mails[1].text);
    assert.notEqual(newToken, oldToken);

    // Old link is dead, new link verifies.
    const stale = await verifyPost(oldToken);
    assert.equal(stale.status, 400, stale.text);

    const fresh = await verifyPost(newToken);
    assert.equal(fresh.status, 200, fresh.text);
  });
});

/* ========================================================================== */
/* 2. Resend verification endpoint                                               */
/* ========================================================================== */

describe("resend verification", () => {
  const resend = (email) =>
    apiFetch("/api/auth/resend-verification", {
      method: "POST",
      body: { email },
    });

  /*
   * Seed a pending record directly: the resend path only reads it, so HTTP
   * registration here would only burn the shared register budget without
   * testing anything extra. Tokens are fixed strings (hashed like the real
   * flow hashes them), so the old/new-link assertions stay exact.
   */
  const seedPending = async ({
    email,
    token,
    minutesAgoSent = 0,
    count = 1,
    expired = false,
  } = {}) => {
    const now = Date.now();
    await pendingRegistrationModel.create({
      name: "Resend Tester",
      email: email.toLowerCase(),
      passwordHash: "test-hash",
      phone: "9876543210",
      addresses: [],
      verificationTokenHash: crypto
        .createHash("sha256")
        .update(token)
        .digest("hex"),
      verificationTokenExpiresAt: new Date(now + (expired ? -2000 : 900_000)),
      registrationExpiresAt: new Date(now + (expired ? -1000 : 1_800_000)),
      lastVerificationSentAt: new Date(now - minutesAgoSent * 60_000),
      verificationSendCount: count,
    });
    return token;
  };

  const seedEmail = () =>
    `resend-${Date.now()}-${emailCounter}-${Math.random().toString(36).slice(2, 8)}@mailhost.test`;

  test("existing and non-existing emails get byte-identical generic bodies", async () => {
    const email = seedEmail();
    await seedPending({ email, token: "a".repeat(64), minutesAgoSent: 0 });

    const existing = await resend(email);
    assert.equal(existing.status, 200, existing.text);

    const missing = await resend(`nobody-${Date.now()}@mailhost.test`);
    assert.equal(missing.status, 200, missing.text);

    assert.deepEqual(missing.json, existing.json);
  });

  test("resend inside the cooldown sends no new mail", async () => {
    clearSentMessages();
    const email = seedEmail();
    await seedPending({ email, token: "b".repeat(64), minutesAgoSent: 0 });

    const resent = await resend(email);
    assert.equal(resent.status, 200, resent.text);
    assert.equal(resent.json.retryAfterSeconds, 60);

    assert.equal(getSentMessagesOfKind("email-verification").length, 0);
  });

  test("resend outside the cooldown rotates and the old link dies", async () => {
    clearSentMessages();
    const email = seedEmail();
    const oldToken = "c".repeat(64);
    await seedPending({ email, token: oldToken, minutesAgoSent: 2 });

    const resent = await resend(email);
    assert.equal(resent.status, 200, resent.text);

    const mails = getSentMessagesOfKind("email-verification");
    assert.equal(mails.length, 1);
    const newToken = extractToken(mails[0].text);
    assert.notEqual(newToken, oldToken);

    assert.equal(
      (await verifyPost(oldToken)).status,
      400,
    );
    assert.equal(
      (await verifyPost(newToken)).status,
      200,
    );
  });

  test("resend for an expired record sends nothing but stays generic", async () => {
    clearSentMessages();
    const email = seedEmail();
    await seedPending({ email, token: "d".repeat(64), expired: true });

    const resent = await resend(email);
    assert.equal(resent.status, 200, resent.text);

    // Expired (or TTL-swept) either way: no new mail, same generic body.
    assert.equal(getSentMessagesOfKind("email-verification").length, 0);
  });
});

/* ========================================================================== */
/* 5. Address items are validated (400) before reaching the database              */
/* ========================================================================== */

describe("validateAddressItem", () => {
  const validItem = () => ({
    label: "Home",
    name: "Cooldown Tester",
    phone: "9876543210",
    addressLine1: "1 Test Street",
    city: "Kolkata",
    state: "West Bengal",
    postalCode: "700001",
    country: "India",
    isDefault: true,
  });

  test("a well-formed item passes", () => {
    assert.equal(validateAddressItem(validItem()), null);
  });

  test("missing required fields are rejected", () => {
    const item = validItem();
    delete item.city;
    assert.match(validateAddressItem(item), /city is required/);
  });

  test("wrong types and unknown fields are rejected", () => {
    assert.match(validateAddressItem("not-an-object"), /must be an object/);
    assert.match(validateAddressItem([]), /must be an object/);
    assert.match(
      validateAddressItem({ ...validItem(), role: "admin" }),
      /Unexpected address field: role/,
    );
    assert.match(
      validateAddressItem({ ...validItem(), quantity: 1 }),
      /Unexpected address field: quantity/,
    );
    assert.match(
      validateAddressItem({ ...validItem(), isDefault: "yes" }),
      /isDefault must be a boolean/,
    );
  });

  test("overlong strings are rejected", () => {
    assert.match(
      validateAddressItem({ ...validItem(), addressLine1: "x".repeat(201) }),
      /addressLine1 is too long/,
    );
  });

  test("a malformed address item in register returns 400, not 500", async () => {
    const body = registerBody();
    body.addresses = [
      { name: "No City", phone: "9876543210", addressLine1: "1 Test Street" },
    ];

    const res = await apiFetch("/api/auth/register", { method: "POST", body });
    assert.equal(res.status, 400, res.text);
  });
});

/* ========================================================================== */
/* 3. Verification mail hardening: escaping + SMTP timeouts                      */
/* ========================================================================== */

describe("verification mail hardening", () => {
  test("registrant name is HTML-escaped in the mail body", async () => {
    clearSentMessages();

    await sendVerificationEmail({
      name: "<img src=x onerror=alert(1)>",
      email: "escape@mailhost.test",
      token: "e".repeat(64),
    });

    const mails = getSentMessagesOfKind("email-verification");
    assert.equal(mails.length, 1);
    assert.ok(mails[0].html.includes("&lt;img src=x onerror=alert(1)&gt;"));
    assert.equal(mails[0].html.includes("<img src=x"), false);
  });

  test("a hung SMTP provider fails fast instead of holding the send open", async () => {
    // Blackhole: accepts TCP and never answers, so only a configured
    // greeting/connection timeout can end the attempt.
    const blackhole = net.createServer((socket) => {
      socket.on("error", () => {});
    });
    await new Promise((resolve) => blackhole.listen(0, "127.0.0.1", resolve));
    const { port } = blackhole.address();

    const here = path.dirname(fileURLToPath(import.meta.url));
    const serviceUrl = pathToFileURL(
      path.resolve(here, "../src/services/email.service.js"),
    ).href;

    const script = `
      const { sendVerificationEmail } = await import(${JSON.stringify(serviceUrl)});
      const started = Date.now();
      try {
        await sendVerificationEmail({ name: 'T', email: 't@mailhost.test', token: 'f'.repeat(64) });
        console.log(JSON.stringify({ sent: true, elapsedMs: Date.now() - started }));
      } catch (error) {
        console.log(JSON.stringify({ sent: false, code: error?.code ?? null, elapsedMs: Date.now() - started }));
      }
    `;

    try {
      const started = Date.now();
      const { stdout } = await promisify(execFile)(
        process.execPath,
        ["--input-type=module", "-e", script],
        {
          cwd: path.resolve(here, ".."),
          timeout: 60_000,
          env: {
            ...process.env,
            NODE_ENV: "development",
            EMAIL_NOTIFICATIONS_ENABLED: "true",
            SMTP_HOST: "127.0.0.1",
            SMTP_PORT: String(port),
            SMTP_SECURE: "false",
          },
        },
      );
      const totalMs = Date.now() - started;
      const outcome = JSON.parse(stdout.trim().split("\n").pop());

      // Rejected (not hung, not delivered), bounded by the 10s SMTP timeouts.
      assert.equal(outcome.sent, false);
      assert.ok(
        outcome.elapsedMs >= 8000,
        `returned too fast for a timeout: ${outcome.elapsedMs}ms`,
      );
      assert.ok(
        totalMs < 45_000,
        `took too long — timeouts may be missing: ${totalMs}ms`,
      );
    } finally {
      blackhole.close();
    }
  });
});

/* ========================================================================== */
/* Send-decision helper (pure unit tests, including the capped path)            */
/* ========================================================================== */

describe("verificationSendDecision", () => {
  test("no live record → send with count reset", () => {
    assert.deepEqual(
      verificationSendDecision(
        { isLive: false, sendCount: 4, lastSentAtMs: Date.now() },
        Date.now(),
      ),
      { action: "send", resetCount: true },
    );
  });

  test("at the send cap → capped, even outside the cooldown", () => {
    assert.deepEqual(
      verificationSendDecision(
        { isLive: true, sendCount: 5, lastSentAtMs: Date.now() - 3600_000 },
        Date.now(),
      ),
      { action: "capped" },
    );
    assert.deepEqual(
      verificationSendDecision(
        { isLive: true, sendCount: 9, lastSentAtMs: undefined },
        Date.now(),
      ),
      { action: "capped" },
    );
  });

  test("below the cap inside the window → cooldown with a countdown", () => {
    const now = 1_700_000_000_000;
    const decision = verificationSendDecision(
      { isLive: true, sendCount: 1, lastSentAtMs: now - 30_000 },
      now,
    );
    assert.equal(decision.action, "cooldown");
    assert.equal(decision.retryAfterSeconds, 30);
  });

  test("exactly at the window edge → send (boundary is exclusive)", () => {
    const now = 1_700_000_000_000;
    assert.deepEqual(
      verificationSendDecision(
        { isLive: true, sendCount: 1, lastSentAtMs: now - 60_000 },
        now,
      ),
      { action: "send", resetCount: false },
    );
  });

  test("one millisecond inside the window → cooldown with a 1s countdown", () => {
    const now = 1_700_000_000_000;
    const decision = verificationSendDecision(
      { isLive: true, sendCount: 0, lastSentAtMs: now - 59_999 },
      now,
    );
    assert.equal(decision.action, "cooldown");
    assert.equal(decision.retryAfterSeconds, 1);
  });

  test("no prior send timestamp → send (pre-change records)", () => {
    assert.deepEqual(
      verificationSendDecision(
        { isLive: true, sendCount: 0, lastSentAtMs: undefined },
        Date.now(),
      ),
      { action: "send", resetCount: false },
    );
  });
});
