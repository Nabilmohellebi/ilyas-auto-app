import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getSettings } from '../utils/useSettings'

function defaultMessages(shopName) {
  return [
    '🚗 Découvrez nos véhicules neufs et d’occasion',
    '🔄 Achat, vente, reprise et échange',
    `📞 Contactez ${shopName} sur WhatsApp`,
  ]
}

export default function AnnouncementBar() {
  const [messages, setMessages] = useState(defaultMessages('Nabil Auto'))

  useEffect(() => {
    let mounted = true
    getSettings().then(settings => {
      if (mounted) setMessages(defaultMessages(settings.shop_name || 'Nabil Auto'))
    }).catch(() => {})
    supabase
      .from('banner_messages')
      .select('message')
      .eq('actif', true)
      .order('position', { ascending: true })
      .then(({ data }) => { if (mounted && data && data.length > 0) setMessages(data.map(d => d.message)) })
    return () => { mounted = false }
  }, [])

  if (messages.length === 0) return null
  const all = [...messages, ...messages]

  return (
    <div className="announce-bar">
      <div className="announce-track" style={{ animation: `bannerScroll ${Math.max(20, messages.length * 6)}s linear infinite` }}>
        {all.map((msg, i) => (
          <span key={i} className="announce-item">{msg} <span className="announce-dot">✦</span></span>
        ))}
      </div>
    </div>
  )
}
