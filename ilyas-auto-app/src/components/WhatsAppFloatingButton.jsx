import { useRef, useState } from 'react'
import WhatsAppIcon from './WhatsAppIcon'

const DISMISS_ZONE_HEIGHT = 126
const DISMISS_ZONE_HALF_WIDTH = 118

function isWhatsAppUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'wa.me'
      && /^\\d{8,15}$/.test(url.pathname.replace(/^\\//, ''))
  } catch {
    return false
  }
}

export default function WhatsAppFloatingButton({ href, lang = 'fr' }) {
  const [dismissed, setDismissed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState(null)
  const drag = useRef(null)
  const suppressClick = useRef(false)

  function handlePointerDown(event) {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
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
    if (!current.moved && Math.hypot(deltaX, deltaY) < 10) return

    current.moved = true
    suppressClick.current = true
    setDragging(true)

    const width = current.rect.width
    const height = current.rect.height
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, current.rect.left + deltaX))
    const top = Math.max(8, Math.min(window.innerHeight - height - 8, current.rect.top + deltaY))
    setPosition({ left, top })
  }

  function finishDrag(event) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (!current.moved) return

    setDragging(false)
    const nearBottom = event.clientY >= window.innerHeight - DISMISS_ZONE_HEIGHT
    const nearCenter = Math.abs(event.clientX - window.innerWidth / 2) <= DISMISS_ZONE_HALF_WIDTH
    if (nearBottom && nearCenter) {
      setDismissed(true)
      return
    }

    // Keep the bubble at its new position when released outside the red dismiss target.
    const width = current.rect.width
    const height = current.rect.height
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - width / 2))
    const top = Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - height / 2))
    setPosition({ left, top })
  }

  function cancelDrag(event) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (current.moved) {
      setDragging(false)
      suppressClick.current = true
    }
  }

  function handleClick(event) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
      return
    }
    event.preventDefault()
    if (!isWhatsAppUrl(href)) return
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (dismissed || !isWhatsAppUrl(href)) return null

  return (
    <>
      <div
        className={`wa-float-shell ${dragging ? 'is-dragging' : ''}`}
        style={position ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' } : undefined}
      >
        <button
          type="button"
          className="wa-float"
          aria-label={lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Nous contacter sur WhatsApp'}
          title="WhatsApp"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onClick={handleClick}
        >
          <WhatsAppIcon size={31} />
        </button>
      </div>
      <div className={`wa-dismiss-zone ${dragging ? 'visible' : ''}`} aria-hidden={!dragging}>
        <span className="wa-dismiss-zone-icon">×</span>
        <small>{lang === 'ar' ? 'اترك هنا للإخفاء' : 'Déposer ici pour masquer'}</small>
      </div>
    </>
  )
}
