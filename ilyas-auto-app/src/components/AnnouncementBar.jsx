import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DEFAULT_MSGS = [
  '🚗 Nouveaux arrivages chaque semaine',
  '✅ Véhicules contrôlés avant vente',
  '📞 Réponse rapide sur WhatsApp',
]

export default function AnnouncementBar() {
  const [messages, setMessages] = useState(DEFAULT_MSGS)

  useEffect(() => {
    supabase
      .from('banner_messages')
      .select('message')
      .eq('actif', true)
      .order('position', { ascending: true })
      .then(({ data }) => { if (data && data.length > 0) setMessages(data.map(d => d.message)) })
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
