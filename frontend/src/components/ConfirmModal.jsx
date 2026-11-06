import { AlertTriangle, Trash2, X } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger', // 'danger' | 'primary' | 'warning'
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!isOpen) return null

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
      style={{ zIndex: 9999 }}
    >
      <div className="modal-box" style={{ maxWidth: 440, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: confirmVariant === 'danger' ? 'var(--error-fondo)' : 'var(--info-fondo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {confirmVariant === 'danger' ? (
              <Trash2 size={22} color="var(--danger, #ef4444)" />
            ) : (
              <AlertTriangle size={22} color="var(--accent, #3b82f6)" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onCancel}
            disabled={loading}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={confirmVariant === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={loading}
            style={{ padding: '8px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {confirmVariant === 'danger' && <Trash2 size={15} />}
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
