export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    }

    if (method === 'OPTIONS') return new Response(null, { headers: cors })

    if (path === '/api/ping') {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (method === 'POST' && path === '/api/push') {
      const apiKey = request.headers.get('X-API-Key')
      if (apiKey !== env.API_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })

      const body = await request.json()
      const kv = env.A10LUCKY_DATA
      const writes = []

      if (body.market) writes.push(kv.put('market_latest', JSON.stringify(body.market)))
      if (body.strategies) writes.push(kv.put('strategies_latest', JSON.stringify(body.strategies)))
      if (body.meta) writes.push(kv.put('meta', JSON.stringify(body.meta)))
      if (body.archive) writes.push(kv.put(`archive:${body.archive.date}`, JSON.stringify(body.archive)))
      if (body.archive_index) writes.push(kv.put('archive_index', JSON.stringify(body.archive_index)))

      await Promise.all(writes)
      return new Response(JSON.stringify({ ok: true, writes: writes.length }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (method === 'GET') {
      const KV_MAP = {
        '/data/market/latest.json': 'market_latest',
        '/data/strategies/latest.json': 'strategies_latest',
        '/data/market/meta.json': 'meta',
        '/data/archive/index.json': 'archive_index',
      }

      let kvKey = KV_MAP[path]
      if (!kvKey && path.startsWith('/data/archive/') && path.endsWith('.json')) {
        kvKey = `archive:${path.replace('/data/archive/', '').replace('.json', '')}`
      }

      if (!kvKey) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })

      const value = await env.A10LUCKY_DATA.get(kvKey)
      if (!value) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })

      return new Response(value, { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response('not found', { status: 404, headers: cors })
  },
}
