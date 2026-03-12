import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ClassCost Error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#080812', color: '#e2e0ff', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Something went wrong</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
              The app encountered an error. Tap below to reset and start fresh.
            </p>
            <p style={{ fontSize: '12px', color: '#ef4444', background: '#1a0a0a', borderRadius: '12px', padding: '12px', marginBottom: '24px', wordBreak: 'break-all' }}>
              {this.state.error?.message || "Unknown error"}
            </p>
            <button onClick={this.handleReset}
              style={{ width: '100%', padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Reset & Reload
            </button>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{ width: '100%', padding: '14px', marginTop: '8px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e1e3a', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}>
              Try Reload Without Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
