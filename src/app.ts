import { FastifyPluginAsync, RequestGenericInterface } from 'fastify';
import cache from './plugins/cache';
import rateLimit, { RateCounter } from './plugins/rateLimit';
import config from '../config.json';
import sensible from './plugins/sensible';

export enum Errors {
  RateExceeded = 'RateExceeded',
  BadAccessKey = 'BadAccessKey'
}

const app: FastifyPluginAsync = async (instance, opts) => {

  instance.register(cache)
  instance.register(rateLimit)
  instance.register(sensible)
  interface RequestGet extends RequestGenericInterface {
    Querystring: {
      ip: string
    }
  }
  instance.get<RequestGet>('/ip', async (request, reply) => {
    try {
      const ip = request.query.ip
      const country = await getCountry(ip)
      return { country }
    } catch (e: any) {
      switch (e?.message) {
        case Errors.BadAccessKey:
          return reply.forbidden()
        case Errors.RateExceeded:
          return reply.tooManyRequests()
        default:
          return reply.internalServerError()
      }
    }

  })
  interface RequestPost extends RequestGenericInterface {
    Body: {
      ip: string
    }
  }
  instance.post<RequestPost>('/ip', async (request, reply) => {
    try {
      const ip = request.body.ip
      const country = await getCountry(ip)
      return { country }
    } catch (e: any) {
      switch (e?.message) {
        case Errors.BadAccessKey:
          return reply.forbidden()
        case Errors.RateExceeded:
          return reply.tooManyRequests()
        default:
          return reply.internalServerError()
      }
    }
  })

  async function getCountry(ip: string): Promise<string> {
    if (ip in instance.cache) {
      return instance.cache[ip]
    }
    // this method has a potential bug if it's called exactly 24 hours apart
    const hour = new Date().getHours().toString()
    const rateLimitCount = instance.rateLimits.counts
    try {
      const country = await invokeIpApi(rateLimitCount.ipapi, hour, instance.rateLimits.max.ipapi, ip);
      instance.incrementCounter('ipapi', hour)
      instance.cache[ip] = country
      return country
    } catch (e) {
      try {
        const country = await invokeIpStack(rateLimitCount.ipstack, hour, instance.rateLimits.max.ipstack, ip);
        instance.incrementCounter('ipstack', hour)
        instance.cache[ip] = country
        return country
      } catch (e: any) {
        if (e?.message === Errors.RateExceeded || e?.message === Errors.BadAccessKey) {
          throw (e)
        }
        throw new Error('backend error')
      }
    }
  }
}

export default app
export { app }

export async function invokeIpStack(rateCount: RateCounter['ipstack'], hour: string, rateLimit: number, ip: string) {
  if (rateCount?.[hour] >= rateLimit) {
    throw Error(Errors.RateExceeded);
  } else if (rateCount?.[hour]) {
    rateCount[hour] += 1;
  } else {
    rateCount = { [hour]: 1 };
  }
  const resp = await fetch(`http://api.ipstack.com/${ip}?access_key=${config.accessKey}`);
  const respJson = await resp.json() as { country_name: string; error?: { type: string; }; };
  if ((respJson.error)) {
    if (respJson.error.type === 'invalid_access_key') {
      throw Error(Errors.BadAccessKey);
    }
    throw Error();
  }
  return respJson.country_name;
}

export async function invokeIpApi(rateCount: RateCounter['ipapi'], hour: string, rateLimit: number, ip: string) {
  if (rateCount?.[hour] >= rateLimit) {
    throw Error(Errors.RateExceeded);
  } else if (rateCount?.[hour]) {
    rateCount[hour] += 1;
  } else {
    rateCount = { [hour]: 1 };
  }
  const resp = await (await fetch(`http://ip-api.com/json/${ip}`)).json() as { status: string, country: string; };
  if (resp.status !== 'success') {
    throw Error()
  }
  return resp.country;
}
