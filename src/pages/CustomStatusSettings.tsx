import { useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { useBusiness } from '../hooks/useBusiness'
import { useCustomStatuses } from '../hooks/useCustomStatuses'
import { useProducts } from '../hooks/useProducts'
import { useToast } from '../hooks/useToast'
import {
  CUSTOM_STATUS_COLOURS,
  getCustomStatusStyle,
} from '../lib/productStatus'
import type {
  CustomProductStatus,
  CustomStatusColour,
} from '../types/customStatus'

export default function CustomStatusSettings() {
  const { currentBusiness } = useBusiness()
  const {
    statuses,
    loading,
    createStatus,
    updateStatus,
    deleteStatus,
  } = useCustomStatuses()
  const { products, refreshProducts } = useProducts()
  const { showToast } = useToast()

  const canManage =
    currentBusiness?.memberRole === 'owner'
    || currentBusiness?.memberRole === 'admin'

  const [name, setName] = useState('')
  const [colour, setColour] = useState<CustomStatusColour>('amber')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CustomProductStatus | null>(null)
  const [editName, setEditName] = useState('')
  const [editColour, setEditColour] = useState<CustomStatusColour>('slate')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] =
    useState<CustomProductStatus | null>(null)
  const [deleting, setDeleting] = useState(false)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of products) {
      if (product.status === 'Custom' && product.customStatusId) {
        counts.set(
          product.customStatusId,
          (counts.get(product.customStatusId) ?? 0) + 1,
        )
      }
    }
    return counts
  }, [products])

  async function handleCreate() {
    if (creating) return
    setCreating(true)

    try {
      const created = await createStatus(name, colour)
      setName('')
      setColour('amber')
      showToast(`“${created.name}” status created`, 'success')
    } catch (error) {
      console.error(error)
      showToast(
        error instanceof Error ? error.message : 'The status could not be created.',
        'error',
      )
    } finally {
      setCreating(false)
    }
  }

  function startEdit(status: CustomProductStatus) {
    setEditing(status)
    setEditName(status.name)
    setEditColour(status.colour)
  }

  async function handleSaveEdit() {
    if (!editing || saving) return
    setSaving(true)

    try {
      await updateStatus(editing.id, {
        name: editName,
        colour: editColour,
      })
      showToast('Custom status updated', 'success')
      setEditing(null)
    } catch (error) {
      console.error(error)
      showToast(
        error instanceof Error ? error.message : 'The status could not be updated.',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete || deleting) return
    setDeleting(true)

    try {
      const affected = await deleteStatus(pendingDelete.id)
      await refreshProducts()
      showToast(
        affected
          ? `Status deleted. ${affected} product${affected === 1 ? '' : 's'} moved to Unlisted.`
          : 'Custom status deleted',
        'success',
      )
      setPendingDelete(null)
    } catch (error) {
      console.error(error)
      showToast('The custom status could not be deleted.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="panel-v2 custom-status-settings-v2">
      <header className="panel-v2-header">
        <div>
          <h2>Custom inventory statuses</h2>
          <p>
            Create neutral workflow labels such as Mystery Bag, Needs Cleaning or Photography.
          </p>
        </div>
      </header>

      <div className="custom-status-settings-body-v2">
        {canManage && (
          <div className="custom-status-create-v2">
            <label>
              <span>Status name</span>
              <input
                type="text"
                maxLength={40}
                value={name}
                placeholder="e.g. Mystery Bag"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleCreate()
                  }
                }}
              />
            </label>

            <label>
              <span>Colour</span>
              <select
                value={colour}
                onChange={(event) =>
                  setColour(event.target.value as CustomStatusColour)
                }
              >
                {CUSTOM_STATUS_COLOURS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={() => void handleCreate()}
              disabled={creating || !name.trim()}
            >
              {creating ? 'Creating…' : 'Add status'}
            </button>
          </div>
        )}

        {!canManage && (
          <div className="settings-locked-v2">
            <strong>View only</strong>
            <span>Business owners and admins can create or manage custom statuses.</span>
          </div>
        )}

        <div className="custom-status-list-v2">
          {loading ? (
            <div className="action-empty-v2">
              <strong>Loading statuses…</strong>
            </div>
          ) : statuses.length === 0 ? (
            <div className="action-empty-v2">
              <strong>No custom statuses yet</strong>
              <span>
                Add one when you need a neutral stock bucket that SellerHQ should not interpret as a built-in workflow state.
              </span>
            </div>
          ) : (
            statuses.map((status) => {
              const count = usage.get(status.id) ?? 0
              const isEditing = editing?.id === status.id

              return (
                <div className="custom-status-row-v2" key={status.id}>
                  {isEditing ? (
                    <>
                      <div className="custom-status-edit-fields-v2">
                        <input
                          type="text"
                          maxLength={40}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                        <select
                          value={editColour}
                          onChange={(event) =>
                            setEditColour(event.target.value as CustomStatusColour)
                          }
                        >
                          {CUSTOM_STATUS_COLOURS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="custom-status-actions-v2">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditing(null)}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleSaveEdit()}
                          disabled={saving || !editName.trim()}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="custom-status-row-main-v2">
                        <span
                          className="status-badge custom-status-badge"
                          style={getCustomStatusStyle(status.colour)}
                        >
                          {status.name}
                        </span>
                        <span className="custom-status-usage-v2">
                          {count} product{count === 1 ? '' : 's'}
                        </span>
                      </div>

                      {canManage && (
                        <div className="custom-status-actions-v2">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => startEdit(status)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button custom-status-delete-v2"
                            onClick={() => setPendingDelete(status)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete custom status"
        message={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? Products currently using it will move to Unlisted.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete status'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
      />
    </section>
  )
}
