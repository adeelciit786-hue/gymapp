export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if ([502, 503].includes(response.status)) {
    throw new ApiError(response.status, 'The API server is unavailable. Run npm run dev in the project folder, then try again.')
  }
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError(response.status, 'The API server returned an unexpected response. Please try again.')
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('forge:auth-expired'))
    }
    throw new ApiError(response.status, payload?.error?.message || 'The request could not be completed.')
  }
  return payload.data
}
