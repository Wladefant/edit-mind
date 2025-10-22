import { FallbackProps } from 'react-error-boundary'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { ErrorIcon } from '../icons/ErrorIcon'

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ErrorIcon className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An unexpected error occurred in the application. Please try refreshing the page or contact support if the
              problem persists.
            </p>
          </div>

          {error && (
            <details className="group">
              <summary className="cursor-pointer list-none">
                <Badge variant="outline" className="hover:bg-accent border-border/50">
                  <svg
                    className="w-4 h-4 mr-1 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Error Details
                </Badge>
              </summary>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg border border-border/50 text-left">
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Error Message
                    </span>
                    <pre className="mt-1 text-sm text-foreground bg-background p-2 rounded border border-border/50 overflow-x-auto">
                      {error.message}
                    </pre>
                  </div>
                  {error.stack && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Stack Trace
                      </span>
                      <pre className="mt-1 text-xs text-muted-foreground bg-background p-2 rounded border border-border/50 overflow-x-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => window.location.reload()} className="flex-1" size="lg">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reload Page
            </Button>
            <Button variant="outline" onClick={resetErrorBoundary} className="flex-1" size="lg">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
