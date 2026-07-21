export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*' } })
    }
    return new Response(JSON.stringify({ path: url.pathname }), {
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}
