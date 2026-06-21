function Toast({ message, type = 'info' }) {
  return <div className={`toast toast-${type}`} role="status" aria-live="polite">{message}</div>
}

export default Toast
