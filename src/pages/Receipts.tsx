import { useMemo, useRef, useState } from 'react'

import { useReceipts } from '../hooks/useReceipts'
import { useToast } from '../hooks/useToast'
import { uploadReceipt } from '../lib/storage'
import { formatBytes, formatDate } from '../utils/format'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { ConfirmDialog } from '../components/ConfirmDialog'

const ACCEPTED = 'image/*,application/pdf'

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

function Receipts() {
  const { receipts, loading, addReceipt, deleteReceipt } = useReceipts()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const totalSize = useMemo(() => {
    return receipts.reduce((sum, receipt) => sum + receipt.fileSize, 0)
  }, [receipts])

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) =>
      file.type.startsWith('image/') || file.type === 'application/pdf',
    )

    if (list.length === 0) {
      showToast('Please choose an image or PDF receipt', 'error')
      return
    }

    setUploading(true)
    let uploaded = 0

    for (const file of list) {
      const result = await uploadReceipt(file)
      if (!result) {
        showToast(`Could not upload "${file.name}"`, 'error')
        continue
      }
      try {
        await addReceipt({
          filePath: result.filePath,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          uploadedAt: new Date().toISOString(),
        })
        uploaded += 1
      } catch {
        showToast(`Could not save "${file.name}" to the archive`, 'error')
      }
    }

    setUploading(false)
    if (uploaded > 0) {
      showToast(
        uploaded === 1 ? 'Receipt uploaded' : `${uploaded} receipts uploaded`,
        'success',
      )
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    const receipt = receipts.find((r) => r.id === confirmDeleteId)
    if (!receipt) return

    try {
      await deleteReceipt(receipt.id, receipt.filePath)
      showToast('Receipt deleted', 'success')
    } catch {
      showToast('Failed to delete receipt', 'error')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="page-heading">
          <div>
            <h1>Receipts Archive</h1>
            <p>Keep a copy of your purchase receipts, separate from expenses.</p>
          </div>
        </div>
        <LoadingState label="Loading receipts..." />
      </div>
    )
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Receipts Archive</h1>
          <p>Keep a copy of your purchase receipts, separate from expenses.</p>
        </div>
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload Receipt'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-unlisted">
          <span>Receipts</span>
          <strong>{receipts.length}</strong>
          <span className="stat-label">in this archive</span>
        </div>
        <div className="inventory-stat">
          <span>Storage used</span>
          <strong>{formatBytes(totalSize)}</strong>
          <span className="stat-label">across {receipts.length} file{receipts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="inventory-stat">
          <span>Images</span>
          <strong>{receipts.filter((r) => isImage(r.mimeType)).length}</strong>
          <span className="stat-label">photo receipts</span>
        </div>
        <div className="inventory-stat">
          <span>PDFs</span>
          <strong>{receipts.filter((r) => r.mimeType === 'application/pdf').length}</strong>
          <span className="stat-label">PDF receipts</span>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--shq-accent)' : 'var(--shq-border)'}`,
          borderRadius: 12,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--shq-surface-subtle)' : 'transparent',
          marginBottom: 24,
          transition: 'border-color 0.15s ease',
        }}
      >
        <div style={{ fontSize: 26, marginBottom: 6 }}>🧾</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--shq-ink)' }}>
          {uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Drop receipts here or click to browse'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--shq-ink-faint)', marginTop: 4 }}>
          Images and PDFs. Multiple files supported. Receipts are stored separately from expenses.
        </div>
      </div>

      {receipts.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              style={{
                background: 'var(--shq-surface)',
                border: '1px solid var(--shq-border)',
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <a
                href={receipt.fileUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', textDecoration: 'none' }}
                title={`Open ${receipt.fileName}`}
              >
                {isImage(receipt.mimeType) ? (
                  <img
                    src={receipt.fileUrl}
                    alt={receipt.fileName}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 130,
                      objectFit: 'cover',
                      borderBottom: '1px solid var(--shq-border)',
                      background: 'var(--shq-surface-muted)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 130,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 40,
                      background: 'var(--shq-surface-muted)',
                      borderBottom: '1px solid var(--shq-border)',
                      color: 'var(--shq-ink-faint)',
                    }}
                  >
                    📄
                  </div>
                )}
              </a>
              <div style={{ padding: '12px 14px', flex: 1 }}>
                <div
                  title={receipt.fileName}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--shq-ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {receipt.fileName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)', marginTop: 4 }}>
                  {formatDate(receipt.uploadedAt)} · {formatBytes(receipt.fileSize)}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <a
                    href={receipt.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="row-action-link"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className="row-action-link"
                    onClick={() => setConfirmDeleteId(receipt.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--shq-surface)',
            border: '1px solid var(--shq-border)',
            borderRadius: 12,
          }}
        >
          <EmptyState
            icon="🧾"
            title="No receipts yet"
            description="Upload images or PDFs of your purchase receipts to keep them organised in one place."
            action={{ label: '+ Upload Receipt', onClick: () => fileRef.current?.click() }}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete receipt?"
        variant="danger"
        confirmLabel="Delete"
        message="This permanently removes the receipt file from the archive. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

export default Receipts
