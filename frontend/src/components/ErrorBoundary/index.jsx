import React from "react";

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Part of Comprehensive QA & System Optimization Initiative
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service if available
    if (window.analytics && typeof window.analytics.track === "function") {
      window.analytics.track("Error Boundary Triggered", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const { fallback, level = "global" } = this.props;

      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback(this.state.error, this.handleRetry);
      }

      // Default error UI based on error level
      return (
        <div
          className={`flex flex-col items-center justify-center min-h-96 p-8 bg-gray-50 rounded-lg`}
        >
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="text-red-500 text-6xl">⚠️</div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {level === "global"
                  ? "Something went wrong"
                  : "Component Error"}
              </h2>

              <p className="text-gray-600 mb-4">
                {level === "global"
                  ? "We apologize for the inconvenience. An unexpected error occurred."
                  : "This component encountered an error and cannot be displayed."}
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="text-left mb-4">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                🔄 Try Again
              </button>

              {level === "global" && (
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                >
                  🏠 Go Home
                </button>
              )}
            </div>

            {this.state.errorId && (
              <p className="text-xs text-gray-400 mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route-level Error Boundary
 * Specialized for catching routing-related errors
 */
export class RouteErrorBoundary extends React.Component {
  render() {
    return (
      <ErrorBoundary
        level="route"
        fallback={(error, retry) => (
          <div className="flex flex-col items-center justify-center min-h-96 p-8">
            <div className="text-orange-500 text-6xl mb-4">🚧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Page Load Error
            </h3>
            <p className="text-gray-600 text-center mb-4">
              This page could not be loaded. Please try again or navigate to a
              different page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={retry}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                🔄 Retry
              </button>
              <button
                onClick={() => window.history.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                ← Go Back
              </button>
            </div>
          </div>
        )}
        {...this.props}
      />
    );
  }
}

/**
 * Component-level Error Boundary
 * For wrapping individual components that may fail
 */
export class ComponentErrorBoundary extends React.Component {
  render() {
    return (
      <ErrorBoundary
        level="component"
        fallback={(error, retry) => (
          <div className="p-4 border border-red-200 bg-red-50 rounded">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="text-sm text-red-700">
                Component failed to load
              </span>
              <button
                onClick={retry}
                className="ml-auto text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {...this.props}
      />
    );
  }
}

/**
 * Async Error Boundary for handling Promise rejections
 * Handles errors in async operations and lazy loading
 */
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, loading: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, loading: false };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AsyncErrorBoundary caught an error:", error, errorInfo);
  }

  componentDidMount() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener(
      "unhandledrejection",
      this.handlePromiseRejection
    );
  }

  handlePromiseRejection = (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    this.setState({ hasError: true });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-8">
          <div className="text-yellow-500 text-5xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading Error
          </h3>
          <p className="text-gray-600 mb-4">
            Failed to load content. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors mx-auto"
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
