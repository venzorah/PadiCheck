import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const code = ts.transpileModule(await readFile(new URL('../src/utils/presentationAdapters.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { investigationView, specialistView } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const row = { investigation_id: 'check', investigation_type: 'company_research', title: 'Company check', created_at: '2026-10-23T00:00:00Z', status: 'failed', result_summary: null };

test('failed checks explain evidence validation and provider failures with a next action', () => {
  assert.match(investigationView({ ...row, error_code: 'invalid_model_output' }).summary, /validated against its sources.*Retry/);
  assert.match(investigationView({ ...row, error_code: 'provider_timeout' }).summary, /too long.*Retry/);
  assert.match(investigationView({ ...row, error_code: 'no_readable_evidence' }).summary, /No readable source evidence.*Add a website/);
  assert.match(investigationView({ ...row, error_code: 'unknown_private_failure' }).summary, /could not be completed/);
  assert.doesNotMatch(investigationView({ ...row, error_code: 'unknown_private_failure' }).summary, /unknown_private_failure/);
});

test('pending and cancelled checks show their actual state rather than a failure placeholder', () => {
  assert.match(investigationView({ ...row, status: 'queued' }).summary, /queued/);
  assert.match(investigationView({ ...row, status: 'analyzing' }).summary, /analysing/);
  assert.match(investigationView({ ...row, status: 'cancelled' }).summary, /cancelled/);
});

test('completed evidence summaries are preserved verbatim', () => {
  assert.equal(investigationView({ ...row, status: 'completed', result_summary: 'Only limited source evidence was available.' }).summary,
    'Only limited source evidence was available.');
});

test('provider reports distinguish registration, location and unavailable services without broad verified badges', () => {
  const check = { kind: 'business', provider: 'Registry provider', status: 'record_matched', checked_at: '2026-10-24T00:00:00Z',
    summary: 'The supplied registration details matched.', facts: [{ label: 'Number', value: 'RC123456' }] };
  assert.equal(specialistView(check).headline, 'Registration details matched');
  assert.equal(specialistView(check).verdict, 'caution');
  assert.match(specialistView({ ...check, kind: 'property', status: 'location_found' }).headline, /title remains unverified/);
  assert.equal(specialistView({ ...check, status: 'not_configured', checked_at: null }).headline, 'Service not configured');
});
