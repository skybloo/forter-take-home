// TODO test rate limits
// todo test errors
// todo test caching

import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

import { invokeIpApi, invokeIpStack } from '../../src/app'

test('smoke test', async (t) => {
  const app = await build(t)

  const get = await app.inject({
    url: '/ip?ip=74.102.202.138'
  })
  assert.deepStrictEqual(JSON.parse(get.payload), {country: 'United States'})
  const post = await app.inject({
    url: '/ip',
    method: 'POST',
    body: {ip: '74.102.202.138'}
  })
  assert.deepStrictEqual(JSON.parse(post.payload), {country: 'United States'})

})

test('ipapi smoke test', async (t) => {
  const result = await invokeIpApi({}, "1", 1, '74.102.202.138')
  assert.equal(result, 'United States')
})
test('ipstack smoke test', async (t) => {
  const result = await invokeIpStack({}, "1", 1, '74.102.202.138')
  assert.equal(result, 'United States')
})

test('rate limits',async (t) => {
  const original = process.env['config_location']
  process.env['config_location'] = 'test/config.test.json'
  const app = await build(t)
  await app.inject({url: '/ip?ip=74.102.202.138'})
  await app.inject({url: '/ip?ip=74.102.202.139'})
  const res = await app.inject({url: '/ip?ip=1.1.1.3'})
  assert.equal(res.statusCode, 429)
  process.env['config_location'] = original
} )