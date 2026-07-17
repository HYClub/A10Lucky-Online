const BASE = import.meta.env.BASE_URL || '/'
export const dataUrl = (path) => `${BASE}${path.replace(/^\//, '')}`
