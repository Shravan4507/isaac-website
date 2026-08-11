import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="error-boundary-title">SOMETHING WENT WRONG</h2>
            <p className="error-boundary-desc">
              {this.state.error?.message || 'An unexpected application error occurred. We have contained the exception.'}
            </p>
            <div className="error-boundary-actions">
              <button className="error-boundary-btn-primary" onClick={this.handleReset}>
                RELOAD PAGE
              </button>
              <button className="error-boundary-btn-secondary" onClick={() => window.location.href = '/'}>
                RETURN HOME
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
