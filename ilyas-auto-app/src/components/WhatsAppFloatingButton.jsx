import { useRef, useState } from 'react'
import WhatsAppIcon from './WhatsAppIcon'

export default function WhatsAppFloatingButton({ href, lang = 'fr' }) {
  const [dismissed, setDismissed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState(null)
  const drag = useRef(null)
  const suppressClick = useRef(false)

  function handlePointerDown(event) {
    if (event.pointerType !== 'touch') return

    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      moved: false,
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
  }

  function handlePointerMove(event) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return

    const deltaX = event.clientX - current.startX
    const deltaY = event.clientY - current.startY
    if (!current.moved && Math.hypot(deltaX, deltaY) < 9) return

    current.moved = true
    setDragging(true)

    const width = current.rect.width
    const height = current.rect.height
    const left = Math.max(10, Math.min(window.innerWidth - width - 10, current.rect.left + deltaX))
    const top = Math.max(10, Math.min(window.innerHeight - height - 10, current.rect.top + deltaY))
    setPosition({ left, top })
  }

  function finishDrag(event) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null

    if (!current.moved) return

    suppressClick.current = true
    setDragging(false)

    const droppedOnDismiss = event.clientY >= window.innerHeight - 112
      && Math.abs(event.clientX - window.innerWidth / 2) <= 92

    if (droppedOnDismiss) setDismissed(true)
  }

  function handleClick(event) {
    if (!suppressClick.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick.current = false
  }

  function cancelDrag(event) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (current.moved) {
      suppressClick.current = true
      setDragging(false)
    }
  }

  if (dismissed || !href || href === '#') return null

  return (
    <>
      <div
        className={`wa-float-shell ${dragging ? 'is-dragging' : ''}`}
        style={position ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' } : undefined}
      >
        <a
          className="wa-float"
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Nous contacter sur WhatsApp'}
          title="WhatsApp"
          draggable="false"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onClick={handleClick}
        >
          <WhatsAppIcon size={31} />
        </a>
        <button
          type="button"
          className="wa-float-close"
          onClick={() => setDismissed(true)}
          aria-label={lang === 'ar' ? 'إخفاء زر واتساب' : 'Masquer le bouton WhatsApp'}
          title={lang === 'ar' ? 'إخفاء' : 'Masquer'}
        >
          ×
        </button>
      </div>
      <div className={`wa-dismiss-zone ${dragging ? 'visible' : ''}`} aria-hidden={!dragging}>
        <span className="wa-dismiss-zone-icon">×</span>
        <small>{lang === 'ar' ? 'اترك هنا للإخفاء' : 'Déposer ici pour masquer'}</small>
      </div>
    </>
  )
}
