import { FastifyPluginAsync, FastifyServerOptions, RequestGenericInterface } from 'fastify';
import cache from './plugins/cache';
import rateLimit from './plugins/rateLimit';
import config from '../config.json';
import { AutoloadPluginOptions } from '@fastify/autoload';
export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {

}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}



const app: FastifyPluginAsync = async (instance, opts) => {

  instance.register(cache)
  instance.register(rateLimit)
  interface RequestGet extends RequestGenericInterface {
    Querystring: {
      ip: string
    }
  }
  instance.get<RequestGet>('/ip', async (request, reply) => {
    const ip = request.query.ip
    const country = await getCountry(ip)
    return { country }

  })
  interface RequestPost extends RequestGenericInterface {
    Body: {
      ip: string
    }
  }

  instance.post<RequestPost>('/ip', async (request, reply) => {
    const ip = request.body.ip
    const country = await getCountry(ip)
    return { country }
  })
  async function getCountry(ip: string): Promise<string> {
    if (ip in instance.cache) {
      return instance.cache[ip]
    }
    // this method has a potential bug if it's called exactly 24 hours apart
    const hour = new Date().getHours().toString()
    const rateLimitCount = instance.rateLimits.counts
    try {
      if (rateLimitCount.ipapi?.[hour] >= instance.rateLimits.max.ipapi) {
        // TODO make rate limit error
        throw Error()
      } else if (rateLimitCount.ipapi?.[hour]) {
        rateLimitCount.ipapi[hour] += 1
      } else {
        rateLimitCount.ipapi = { [hour]: 1 }
      }
      const resp = await (await fetch(`http://ip-api.com/json/${ip}`)).json() as { country: string }
      instance.cache[ip] = resp.country
      return resp.country
    } catch (e) {
      try {
        if (rateLimitCount.ipstack?.[hour] >= instance.rateLimits.max.ipstack) {
          // TODO make rate limit error
          throw Error()
        } else if (rateLimitCount.ipstack?.[hour]) {
          rateLimitCount.ipstack[hour] += 1
        } else {
          rateLimitCount.ipstack = { [hour]: 1 }
        }
        const resp = await fetch(`https://api.ipstack.com/${ip}?access_key=${config.accessKey}`)
        const respJson = await resp.json() as { success: boolean, country_name: string, error: { type: string } }
        if (!(respJson.success)) {
          if (respJson.error.type === 'invalid_access_key') {
            throw Error()
          }
          throw Error()
        }
        instance.cache[ip] = respJson.country_name
        return respJson.country_name
      } catch (e) {
        throw new Error('backend error')
      }
    }
  }}

  export default app
  export {app, options}