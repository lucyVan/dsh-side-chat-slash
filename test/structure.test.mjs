/**
 * Structural checks for dsh-side-chat-slash.
 *
 * These assert the invariants that actually break an installation: the browser
 * module id must equal the package name, the bundle patch must name the package,
 * the host half must load, and the client bundle must not require anything
 * outside the platform seed table.
 *
 * Run with: node --test
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => readFileSync(join(root, name), 'utf8')
const pkg = JSON.parse(read('package.json'))

test('package identity is a plain, installable plugin name', () => {
  assert.match(pkg.name, /^[a-z0-9][a-z0-9-]*$/, 'name must be npm-safe lowercase')
  assert.ok(!pkg.name.startsWith('@'), 'no scope is needed for this fork')
  assert.equal(typeof pkg.version, 'string')
})

test('host half loads and exposes the Cordis contract', async () => {
  const host = await import(join(root, 'lib/index.js'))
  assert.equal(typeof host.apply, 'function', 'apply must be exported')
  assert.equal(host.name, 'dsh-side-chat', 'plugin name stays stable')
  for (const service of ['webServer', 'agents', 'timer']) {
    assert.ok(host.inject.includes(service), `inject must list ${service}`)
  }
})

test('client bundle registers the exact package name as its module id', () => {
  const client = read('lib/client.js')
  const match = /__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/.exec(client)
  assert.ok(match !== null, 'client bundle must call __ModuleLoader__.load with an id')
  assert.equal(match[1], pkg.name, 'module id must equal the package name or the row never loads')
})

test('client bundle requires nothing outside the platform seed table', () => {
  const client = read('lib/client.js')
  const required = [...client.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1])
  const allowed = new Set(['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
    '@deepseek-ai/dsh-client-ui-primitives'])
  for (const name of required) {
    assert.ok(allowed.has(name), `unexpected client dependency: ${name}`)
  }
})

test('client half declares no browser module inject (zero dependency edges)', () => {
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.equal(pkg.dsh.client.inject, undefined,
    'inject was removed on purpose: primitives lives in the platform seed table and has a built-in fallback')
})

test('bundle patch names this package so `dsh plugin add` registers the layer', () => {
  const patch = read('cordis.patch.yml')
  assert.match(patch, /- insert:/)
  assert.ok(patch.includes(`name: '${pkg.name}'`), 'patch must insert this package name')
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml')
})

test('community manifest agrees with package.json', () => {
  const manifest = JSON.parse(read('dsh.plugin.json'))
  assert.equal(manifest.id, pkg.name)
  assert.equal(manifest.version, pkg.version)
})

test('declares a host version window instead of an open-ended range', () => {
  assert.ok(pkg.engines?.dsh, 'engines.dsh must be declared')
  assert.match(pkg.engines.dsh, /^>=/ , 'lower bound must be explicit')
  assert.ok(pkg.engines.dsh.includes('<'), 'an upper bound keeps untested majors out')
})

test('host half imports only node builtins', () => {
  const host = read('lib/index.js')
  const imports = [...host.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1])
  for (const specifier of imports) {
    assert.ok(specifier.startsWith('node:'), `host must not import ${specifier}`)
  }
})
