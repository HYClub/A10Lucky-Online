const BASE = import.meta.env.DEV ? '' : import.meta.env.BASE_URL
export const dataUrl = (path) => `${BASE}${path.replace(/^\//, '')}`
