import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] React render failure', {
      name: error.name,
      message: error.message,
      componentStack: info.componentStack,
    })
  }

  private reloadCurrentPage = () => {
    window.location.reload()
  }

  private returnHome = () => {
    window.location.assign('/app/home')
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-5">
        <section className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-ink-900">
            页面暂时无法显示
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            当前页面发生了可恢复的前端错误。你可以重新加载当前页面，或先返回 AI 首页继续使用其他功能。
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.reloadCurrentPage}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载当前页面
            </button>
            <button
              type="button"
              onClick={this.returnHome}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              <Home className="h-4 w-4" />
              返回 AI 首页
            </button>
          </div>
        </section>
      </main>
    )
  }
}
