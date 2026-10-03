import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Registration edge cases:
 * 1. 409 Conflict when an account already exists with the given email.
 * 2. 503 Service Unavailable + pending record deletion when mail provider throws.
 * 3. 400 Bad Request when forbidden/extra keys (e.g. role, isVerified) are injected.
 *
 * Own process, own db, apiFetch harness. Budget: <= 5 register POSTs in this file.
 *
 *   node --test --test-concurrency=1 tests/registerEdgeCases.test.js
 */

import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";

import app from "../src/app/app.js";
import config from "../src/config/config.js";
import userModel from "../src/models/user.model.js";
import pendingRegistrationModel from "../src/models/pendingRegistration.js";
import mailer, { clearSentMessages, getSentMessages } from "../src/services/mailer.service.js";

void fakeRazorpay;

const TEST_DB = "idiot-pedals-test-edge";

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

let counter = 0;
const makeRegisterBody = (overrides = {}) => {
  counter += 1;
  const phone = String(9100000000 + counter);
  return {
    name: "Edge Case User",
    email: `edge-${Date.now()}-${counter}@mailhost.test`,
    phone,
    password: "Password#123",
    addresses: [
      {
        label: "Home",
        name: "Edge Case User",
        phone: "9876543210",
        addressLine1: "123 Test Road",
        city: "Kolkata",
        state: "West Bengal",
        postalCode: "700001",
        country: "India",
      },
    ],
    ...overrides,
  };
};

describe("Registration edge cases", () => {
  before(async () => {
    await mongoose.connect(testMongoUri);
    await mongoose.connection.dropDatabase();

    await Promise.all([userModel.init(), pendingRegistrationModel.init()]);

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

  beforeEach(() => {
    clearSentMessages();
  });

  test("register with an email that already has a real user returns 409", async () => {
    const existingEmail = `existing-${Date.now()}@mailhost.test`;
    const fixturePhone = "9811112233";

    await userModel.create({
      name: "Existing Real User",
      email: existingEmail,
      phone: fixturePhone,
      passwordHash: "$2b$10$abcdefghijklmnopqrstuu",
      role: "customer",
      emailVerified: true,
      authProviders: [{ provider: "email", providerId: existingEmail }],
    });

    const body = makeRegisterBody({ email: existingEmail });
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });

    assert.equal(res.status, 409, res.text);
    assert.equal(res.json?.success, false);
    assert.match(res.json?.message, /already exists/i);

    // No pending registration record created
    const pending = await pendingRegistrationModel.findOne({
      email: existingEmail.toLowerCase(),
    });
    assert.equal(pending, null);
  });

  test("register when the mailer throws returns 503 and deletes the pending record", async (t) => {
    t.mock.method(mailer, "sendMail", async () => {
      throw new Error("simulated SMTP outage");
    });

    const body = makeRegisterBody();
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });

    assert.equal(res.status, 503, res.text);
    assert.equal(res.json?.success, false);
    assert.match(res.json?.message, /verification email could not be sent/i);

    // Pending record was deleted by cleanup
    const pending = await pendingRegistrationModel.findOne({
      email: body.email.toLowerCase(),
    });
    assert.equal(pending, null);
  });

  test("register with extra keys role or isVerified in body returns 400 and nothing is stored", async () => {
    const body = makeRegisterBody({
      role: "admin",
      isVerified: true,
    });

    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body,
    });

    assert.equal(res.status, 400, res.text);
    assert.equal(res.json?.success, false);

    // Nothing was stored in either collection
    const user = await userModel.findOne({ email: body.email.toLowerCase() });
    assert.equal(user, null);

    const pending = await pendingRegistrationModel.findOne({
      email: body.email.toLowerCase(),
    });
    assert.equal(pending, null);
  });

  test("with EMAIL_NOTIFICATIONS_ENABLED=false in a non-production environment, register returns 200 and sends no mail", async () => {
    // Pin CURRENT behavior: in non-production environments (e.g. development),
    // when EMAIL_NOTIFICATIONS_ENABLED is false, registration returns 200 and
    // creates a pending record, but skips mail delivery entirely. This produces
    // an un-verifiable account unless manually verified or resent in dev, which
    // is why config.js strictly forbids EMAIL_NOTIFICATIONS_ENABLED=false in production.
    const origNotifications = config.EMAIL_NOTIFICATIONS_ENABLED;
    const origEnv = config.NODE_ENV;
    config.EMAIL_NOTIFICATIONS_ENABLED = false;
    config.NODE_ENV = "development";

    try {
      const body = makeRegisterBody();
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body,
      });

      assert.equal(res.status, 200, res.text);
      assert.equal(res.json?.success, true);
      assert.equal(getSentMessages().length, 0);

      // Pending record was created even though no verification mail was sent
      const pending = await pendingRegistrationModel.findOne({
        email: body.email.toLowerCase(),
      });
      assert.ok(pending);
    } finally {
      config.EMAIL_NOTIFICATIONS_ENABLED = origNotifications;
      config.NODE_ENV = origEnv;
    }
  });
});

