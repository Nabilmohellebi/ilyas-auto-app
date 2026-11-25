import { useState } from 'react'
import { supabase } from '../supabase'
import '../styles/vehicle-search.css'

const EMPTY_FORM = {
  nom_client: '',
  telephone: '',
  marque: '',
  modele: '',
  budget_min: '',
  budget_max: '',
  annee_min: '',
  annee_max: '',
  km_max: '',
  carburant: '',
  transmission: '',
  notes: '',
}

const COPY = {
  fr: {
    eyebrow: 'SERVICE DE RECHERCHE',
    title: 'Parlons de la voiture que vous cherchez',
    description: 'Décrivez votre besoin. Nabil Auto vous recontactera lorsqu’un véhicule correspondant à vos critères sera disponible.',
    name: 'Nom et prénom *',
    namePlaceholder: 'Votre nom',
    phone: 'Téléphone / WhatsApp *',
    phonePlaceholder: '05 50 12 34 56',
    brand: 'Marque recherchée',
    brandPlaceholder: 'Ex. Volkswagen',
    model: 'Modèle recherché',
    modelPlaceholder: 'Ex. Golf 8 GTD',
    budgetMin: 'Budget minimum (DA)',
    budgetMax: 'Budget maximum (DA)',
    yearMin: 'Année à partir de',
    yearMax: 'Jusqu’à l’année',
    kmMax: 'Kilométrage maximum',
    fuel: 'Carburant',
    transmission: 'Boîte de vitesses',
    any: 'Peu importe',
    diesel: 'Diesel',
    petrol: 'Essence',
    hybrid: 'Hybride',
    electric: 'Électrique',
    lpg: 'GPL',
    automatic: 'Automatique',
    manual: 'Manuelle',
    notes: 'Précisions supplémentaires',
    notesPlaceholder: 'Couleur, finition, options, délai souhaité…',
    submit: '📩 Envoyer ma recherche',
    sending: '⏳ Envoi en cours…',
    close: 'Fermer',
    successTitle: 'Votre recherche a bien été enregistrée !',
    successText: 'Notre équipe dispose maintenant de vos critères et pourra vous recontacter lorsqu’un véhicule correspondant arrive.',
    done: 'Terminer',
    error: 'Impossible d’envoyer votre demande. Vérifiez votre connexion puis réessayez.',
    required: 'Indiquez au moins une marque ou un modèle recherché.',
    phoneError: 'Vérifiez votre numéro de téléphone.',
    rangeError: 'Vérifiez les budgets et les années indiqués.',
  },
  ar: {
    eyebrow: 'خدمة البحث عن سيارة',
    title: 'أخبرنا عن السيارة التي تبحث عنها',
    description: 'صف لنا طلبك. ستتواصل معك نابل أوتو عندما تتوفر سيارة تناسب معاييرك.',
    name: 'الاسم الكامل *',
    namePlaceholder: 'اسمك',
    phone: 'الهاتف / واتساب *',
    phonePlaceholder: '0550 12 34 56',
    brand: 'العلامة التجارية',
    brandPlaceholder: 'مثال: فولكسفاغن',
    model: 'الموديل المطلوب',
    modelPlaceholder: 'مثال: Golf 8 GTD',
    budgetMin: 'الميزانية الدنيا (دج)',
    budgetMax: 'الميزانية القصوى (دج)',
    yearMin: 'السنة ابتداءً من',
    yearMax: 'حتى سنة',
    kmMax: 'الحد الأقصى للكيلومترات',
    fuel: 'نوع الوقود',
    transmission: 'علبة السرعة',
    any: 'لا يهم',
    diesel: 'ديزل',
    petrol: 'بنزين',
    hybrid: 'هجين',
    electric: 'كهربائي',
    lpg: 'غاز',
    automatic: 'أوتوماتيك',
    manual: 'يدوي',
    notes: 'تفاصيل إضافية',
    notesPlaceholder: 'اللون، الفئة، التجهيزات، الوقت المناسب…',
    submit: '📩 إرسال طلب البحث',
    sending: '⏳ جارٍ الإرسال…',
    close: 'إغلاق',
    successTitle: 'تم تسجيل طلب البحث بنجاح!',
    successText: 'أصبح لدى فريقنا الآن معاييرك، وسنتواصل معك عند توفر سيارة مناسبة.',
    done: 'إنهاء',
    error: 'تعذر إرسال الطلب. تحقق من الاتصال ثم حاول مجددًا.',
    required: 'يرجى إدخال العلامة التجارية أو الموديل على الأقل.',
    phoneError: 'يرجى التحقق من رقم الهاتف.',
    rangeError: 'يرجى التحقق من الميزانية والسنوات المحددة.',
  },
}

function numericOrNull(value) {
  if (value === '' || value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export default function VehicleSearchModal({ lang = 'fr', onClose }) {
  const isArabic = lang === 'ar'
  const copy = COPY[isArabic ? 'ar' : 'fr']
  const [form, setForm] = useState(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function setField(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.marque.trim() && !form.modele.trim()) {
      setError(copy.required)
      return
    }
    const phoneDigits = form.telephone.replace(/\D/g, '')
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setError(copy.phoneError)
      return
    }
    const budgetMin = numericOrNull(form.budget_min)
    const budgetMax = numericOrNull(form.budget_max)
    const yearMin = numericOrNull(form.annee_min)
    const yearMax = numericOrNull(form.annee_max)
    if ((budgetMin !== null && budgetMin < 0) ||
        (budgetMax !== null && budgetMax < 0) ||
        (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) ||
        (yearMin !== null && (yearMin < 1950 || yearMin > new Date().getFullYear() + 1)) ||
        (yearMax !== null && (yearMax < 1950 || yearMax > new Date().getFullYear() + 1)) ||
        (yearMin !== null && yearMax !== null && yearMin > yearMax) ||
        (form.km_max !== '' && (!Number.isFinite(Number(form.km_max)) || Number(form.km_max) < 0))) {
      setError(copy.rangeError)
      return
    }

    setSending(true)
    setError('')
    const request = {
      nom_client: form.nom_client.trim(),
      telephone: form.telephone.trim(),
      marque: form.marque.trim() || null,
      modele: form.modele.trim() || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      annee_min: yearMin,
      annee_max: yearMax,
      km_max: numericOrNull(form.km_max),
      carburant: form.carburant || null,
      transmission: form.transmission || null,
      notes: form.notes.trim(),
      source: 'site',
      statut: 'nouvelle',
    }

    try {
      const { error: insertError } = await supabase.from('vehicle_search_requests').insert(request)
      if (insertError) throw insertError
      setSent(true)
    } catch (submitError) {
      console.error('Vehicle search request:', submitError)
      setError(copy.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="vehicle-search-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
      <section className="vehicle-search-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-search-title" dir={isArabic ? 'rtl' : 'ltr'}>
        <header className="vehicle-search-modal-head">
          <div>
            <span className="vehicle-search-modal-eyebrow">{copy.eyebrow}</span>
            <h2 id="vehicle-search-title">{sent ? copy.successTitle : copy.title}</h2>
            {!sent && <p>{copy.description}</p>}
          </div>
          <button type="button" className="vehicle-search-close" onClick={onClose} aria-label={copy.close}>✕</button>
        </header>

        {sent ? (
          <div className="vehicle-search-success">
            <span className="vehicle-search-success-icon">✓</span>
            <p>{copy.successText}</p>
            <button type="button" className="vehicle-search-submit" onClick={onClose}>{copy.done}</button>
          </div>
        ) : (
          <form className="vehicle-search-form" onSubmit={submit}>
            <div className="vehicle-search-form-grid">
              <label className="vehicle-search-field">
                <span>{copy.name}</span>
                <input required minLength={2} maxLength={120} value={form.nom_client} onChange={event => setField('nom_client', event.target.value)} placeholder={copy.namePlaceholder} autoComplete="name" />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.phone}</span>
                <input required type="tel" maxLength={25} value={form.telephone} onChange={event => setField('telephone', event.target.value)} placeholder={copy.phonePlaceholder} autoComplete="tel" />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.brand}</span>
                <input maxLength={80} value={form.marque} onChange={event => setField('marque', event.target.value)} placeholder={copy.brandPlaceholder} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.model}</span>
                <input maxLength={100} value={form.modele} onChange={event => setField('modele', event.target.value)} placeholder={copy.modelPlaceholder} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.budgetMin}</span>
                <input type="number" min="0" step="10000" inputMode="numeric" value={form.budget_min} onChange={event => setField('budget_min', event.target.value)} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.budgetMax}</span>
                <input type="number" min="0" step="10000" inputMode="numeric" value={form.budget_max} onChange={event => setField('budget_max', event.target.value)} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.yearMin}</span>
                <input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.annee_min} onChange={event => setField('annee_min', event.target.value)} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.yearMax}</span>
                <input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.annee_max} onChange={event => setField('annee_max', event.target.value)} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.kmMax}</span>
                <input type="number" min="0" step="5000" inputMode="numeric" value={form.km_max} onChange={event => setField('km_max', event.target.value)} />
              </label>
              <label className="vehicle-search-field">
                <span>{copy.fuel}</span>
                <select value={form.carburant} onChange={event => setField('carburant', event.target.value)}>
                  <option value="">{copy.any}</option>
                  <option value="Diesel">{copy.diesel}</option>
                  <option value="Essence">{copy.petrol}</option>
                  <option value="Hybride">{copy.hybrid}</option>
                  <option value="Électrique">{copy.electric}</option>
                  <option value="GPL">{copy.lpg}</option>
                </select>
              </label>
              <label className="vehicle-search-field">
                <span>{copy.transmission}</span>
                <select value={form.transmission} onChange={event => setField('transmission', event.target.value)}>
                  <option value="">{copy.any}</option>
                  <option value="Automatique">{copy.automatic}</option>
                  <option value="Manuelle">{copy.manual}</option>
                </select>
              </label>
              <label className="vehicle-search-field vehicle-search-field-wide">
                <span>{copy.notes}</span>
                <textarea rows={3} maxLength={1200} value={form.notes} onChange={event => setField('notes', event.target.value)} placeholder={copy.notesPlaceholder} />
              </label>
            </div>
            {error && <p className="vehicle-search-error" role="alert">{error}</p>}
            <div className="vehicle-search-form-footer">
              <span>{isArabic ? 'طلبك يبقى خاصًا بفريق نابل أوتو.' : 'Votre demande est transmise uniquement à l’équipe Nabil Auto.'}</span>
              <button type="submit" className="vehicle-search-submit" disabled={sending}>
                {sending ? copy.sending : copy.submit}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
