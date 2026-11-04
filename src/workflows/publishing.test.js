'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { _assertSafeWebhookUrl } = require('./publishing');

// ── _assertSafeWebhookUrl — SSRF guard ────────────────────────────────────────

describe('_assertSafeWebhookUrl SSRF guard', () => {
  // ── Should pass (legitimate public URLs) ──────────────────────────────────

  it('allows a public https URL', () => {
    assert.doesNotThrow(() => _assertSafeWebhookUrl('https://hooks.example.com/webhook/abc'));
  });

  it('allows a public http URL', () => {
    assert.doesNotThrow(() => _assertSafeWebhookUrl('http://hooks.example.com/webhook/abc'));
  });

  it('allows an n8n cloud webhook URL', () => {
    assert.doesNotThrow(() => _assertSafeWebhookUrl('https://n8n.example.com/webhook/abc123'));
  });

  // ── Should block (private / loopback / link-local) ────────────────────────

  it('blocks localhost', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://localhost:3000/webhook'),
      /localhost|SSRF/i
    );
  });

  it('blocks 127.0.0.1 (loopback)', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://127.0.0.1/jobs'),
      /SSRF|private|loopback/i
    );
  });

  it('blocks 10.x.x.x (RFC-1918 class A)', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://10.0.0.1/internal'),
      /SSRF|private/i
    );
  });

  it('blocks 172.16.x.x (RFC-1918 class B lower)', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://172.16.0.1/secret'),
      /SSRF|private/i
    );
  });

  it('blocks 172.31.x.x (RFC-1918 class B upper)', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://172.31.255.255/secret'),
      /SSRF|private/i
    );
  });

  it('does NOT block 172.32.x.x (outside RFC-1918 range)', () => {
    assert.doesNotThrow(() => _assertSafeWebhookUrl('http://172.32.0.1/ok'));
  });

  it('blocks 192.168.x.x (RFC-1918 class C)', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://192.168.1.1/router'),
      /SSRF|private/i
    );
  });

  it('blocks 169.254.169.254 (AWS metadata endpoint)', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://169.254.169.254/latest/meta-data/'),
      /SSRF|private|loopback/i
    );
  });

  it('blocks 0.0.0.0', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://0.0.0.0/'),
      /localhost|SSRF/i
    );
  });

  it('blocks *.localhost subdomain', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('http://myapp.localhost/'),
      /localhost|SSRF/i
    );
  });

  // ── Invalid URL ───────────────────────────────────────────────────────────

  it('throws for a non-URL string', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('not a url'),
      /Invalid webhook URL/i
    );
  });

  it('throws for a javascript: URL', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('javascript:alert(1)'),
      /http:|https:|must use/i
    );
  });

  it('throws for a file: URL', () => {
    assert.throws(
      () => _assertSafeWebhookUrl('file:///etc/passwd'),
      /http:|https:|must use/i
    );
  });
});
