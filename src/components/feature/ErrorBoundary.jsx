import React from 'react';
import { Btn } from '../ui/Btn';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('EduTrack Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">🔧</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Fraunces',serif" }}>
              Something went wrong
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              An unexpected error occurred. Your data is safely stored in your browser.
            </p>
            <p className="text-xs text-red-400 bg-red-50 rounded-xl p-3 mb-6 font-mono break-all">
              {this.state.error?.message || "Unknown error"}
            </p>
            <Btn onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
              Reload App
            </Btn>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
