from pathlib import Path

path = Path('src/services/api.ts')
text = path.read_text(encoding='utf-8')

old_constants = "const SEARCH_TASK_POLL_INTERVAL_MS = 500\nconst SEARCH_TASK_MAX_POLL_ATTEMPTS = 240"
new_constants = "const SEARCH_TASK_POLL_INTERVAL_MS = 500\nconst SEARCH_TASK_MAX_POLL_ATTEMPTS = 240\nconst DEFAULT_API_TIMEOUT_MS = 15_000"
if old_constants not in text:
    raise RuntimeError('API constants seam was not found')
text = text.replace(old_constants, new_constants, 1)

old_request = """async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiRequestError(
      body.error?.message || `API request failed (${response.status})`,
      response.status,
      body.error?.code,
    )
  }

  return response.json() as Promise<T>
}
"""
new_request = """async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const upstreamSignal = init?.signal
  let timedOut = false
  const abortFromCaller = () => controller.abort(upstreamSignal?.reason)
  if (upstreamSignal?.aborted) {
    abortFromCaller()
  } else {
    upstreamSignal?.addEventListener('abort', abortFromCaller, { once: true })
  }
  const timeout = globalThis.setTimeout(() => {
    timedOut = true
    controller.abort('request-timeout')
  }, DEFAULT_API_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody
      throw new ApiRequestError(
        body.error?.message || `API request failed (${response.status})`,
        response.status,
        body.error?.code,
      )
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (timedOut) {
      throw new ApiRequestError(
        '请求超时，请检查服务状态后重试。',
        408,
        'REQUEST_TIMEOUT',
      )
    }
    throw error
  } finally {
    globalThis.clearTimeout(timeout)
    upstreamSignal?.removeEventListener('abort', abortFromCaller)
  }
}
"""
if old_request not in text:
    raise RuntimeError('API request seam was not found')
text = text.replace(old_request, new_request, 1)
path.write_text(text, encoding='utf-8')
print('Applied frontend API timeout hotfix.')
