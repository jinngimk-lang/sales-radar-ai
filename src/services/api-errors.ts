interface ApiErrorLike {
  code?: unknown
  message?: unknown
}

export function getUserFacingApiError(
  cause: unknown,
  fallback = '暂时无法读取数据，请稍后重试。',
): string {
  if (cause && typeof cause === 'object') {
    const error = cause as ApiErrorLike
    if (error.code === 'BACKEND_NOT_CONFIGURED') {
      return '完整后端未连接，当前功能暂不可用。'
    }
    if (error.code === 'REQUEST_TIMEOUT') {
      return '请求超时，请检查服务状态后重试。'
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message
    }
  }

  return fallback
}
