import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Si algo falla, mostrar el error en vez de una pantalla en blanco.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center"><div className="sheet card">
        <h1>Algo salió mal</h1>
        <div className="note err" style={{ overflowWrap: 'anywhere' }}>{String(this.state.error?.message || this.state.error)}</div>
        <button className="btn" onClick={() => window.location.reload()}>Recargar</button>
      </div></div>
    );
  }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
