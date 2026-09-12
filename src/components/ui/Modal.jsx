import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { WIDTH, cx } from './tokens'
import IconButton from './IconButton'

/**
 * One modal, replacing ten overlays written five different ways and eight
 * different panels. It also supplies the `scaleUp` animation four of those
 * panels asked for and never got -- the keyframe was undefined.
 *
 * Escape closes and the panel takes focus on open; neither was true before.
 */
export default function Modal({
  open = true,
  onClose,
  title,
  eyebrow,
  size = 'sm',
  footer,
  dismissible = true,
  className = '',
  bodyClassName = '',
  children,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open || !dismissible || !onClose) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, dismissible, onClose])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-table/85 backdrop-blur-md animate-fadeIn select-none"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={cx(
          'w-full max-h-[90dvh] flex flex-col outline-none',
          'bg-felt border border-edge rounded-slab shadow-lift-3 animate-scaleUp',
          WIDTH[size],
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div className="min-w-0 space-y-1.5">
              {eyebrow}
              {title && <h2 className="font-display text-2xl text-ink leading-none">{title}</h2>}
            </div>
            {dismissible && onClose && (
              <IconButton label="Close" size="sm" radius="full" onClick={onClose} className="-mr-1 -mt-1 shrink-0">
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </div>
        )}

        <div className={cx('px-5 overflow-y-auto scrollbar-none', title ? 'pt-1' : 'pt-5', bodyClassName)}>
          {children}
        </div>

        <div className="p-5 pt-4">{footer}</div>
      </div>
    </div>
  )
}
