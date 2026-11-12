// ══════════════════════════════════════════════
//  TRADUCTIONS — Français / Arabe
// ══════════════════════════════════════════════

export const fr = {
  nav: { accueil: 'Accueil', stock: 'Notre Stock', showroom: 'Showroom', suivi: 'Suivi commande', whatsapp: 'WhatsApp', occasion: 'Acheter une occasion', venteEchange: 'Vendre / Échanger' },
  hero: {
    eyebrow: 'Import direct : France · Allemagne · Monde',
    titre1: 'VOTRE PROCHAINE VOITURE', titre2: "VIENT D'EUROPE",
    desc: (nom, adresse) => `Découvrez les véhicules neufs et d’occasion proposés par ${nom}, à ${adresse}.`,
    voirStock: '🚗 Voir le stock', visiterShowroom: '📍 Visiter le showroom',
  },
  trust: { stock: 'Véhicules neufs et d’occasion', vente: 'Achat et vente de véhicules', reprise: 'Reprise et échange possibles', accompagnement: 'Accompagnement au showroom' },
  catalogue: {
    titre: 'NOTRE CATALOGUE',
    desc: 'Découvrez notre sélection de véhicules neufs et d’occasion. Prix affichés en dinars algériens (DA).',
    etat: 'État du véhicule', tousEtats: 'Tous les états', occasion: 'Occasion', neuf: 'Neuf',
    toutesCategories: 'Toutes les voitures', neufs: 'Voitures neuves', occasions: 'Voitures d’occasion',
    rechercher: '🔍 Rechercher un modèle...', toutesMarques: 'Toutes les marques', toutesOrigines: 'Toutes origines',
    toutBudget: 'Tout budget', budgetLow: 'Moins de 4 000 000 DA', budgetMid: '4 000 000 – 7 000 000 DA', budgetHigh: 'Plus de 7 000 000 DA',
    triDefaut: 'Tri par défaut', prixCroissant: 'Prix croissant', prixDecroissant: 'Prix décroissant',
    anneeRecent: 'Année (récent)', anneeAncien: 'Année (ancien)', kmMoins: 'Kilométrage (moins)',
    chargement: 'Chargement du stock…', aucunVehiculeLigne: 'Aucun véhicule en ligne pour le moment.', aucunCorrespond: 'Aucun véhicule ne correspond à vos critères.',
  },
  card: { reserver: 'PRENDRE RENDEZ-VOUS', acheterOccasion: 'ACHETER / VISITER', vendu: 'VÉHICULE VENDU', neuf: 'Neuf / 0 km', nouveau: '🆕 Nouveau' },
  showroom: { titre: 'VISITEZ NOTRE SHOWROOM', adresse: 'Adresse', telephone: 'Téléphone / WhatsApp', horaires: 'Horaires', itineraire: '🧭 Itinéraire GPS (Google Maps)' },
  footer: { droits: 'Tous droits réservés.', suivre: '📦 Suivre ma réservation' },
  statut: { disponible: '✅ Disponible', reserve: '⏳ Réservé', vendu: '🚫 Vendu' },
  reservation: {
    titre: 'Demander une présentation privée', sousTitre: 'Choisissez votre créneau, un conseiller vous accueillera personnellement.',
    nom: 'Votre nom *', nomPh: 'Nom et prénom', tel: 'Téléphone *', telPh: '05 50 12 34 56',
    date: 'Date / créneau souhaité (optionnel)', datePh: 'Ex : Cette semaine, en matinée',
    message: 'Message (optionnel)', messagePh: "Je souhaite réserver / avoir plus d'infos...",
    envoyer: '📩 Envoyer la demande', envoiEnCours: '⏳ Envoi en cours...',
    envoye: 'Demande envoyée !', merci: 'Notre équipe vous contactera très vite pour confirmer votre rendez-vous.',
    confirmerWA: 'Accélérez la procédure en confirmant sur WhatsApp :', confirmerBtn: '💬 Confirmer sur WhatsApp',
    fermer: 'Fermer', erreur: 'Une erreur est survenue, merci de réessayer.',
  },
  tracking: {
    titre: '📦 Suivi de réservation', desc: 'Entrez votre numéro de réservation (ex. : IA-XXXXXXXXXXXX)',
    vehicule: 'Véhicule', prix: 'Prix', annulee: '❌ Cette réservation a été annulée.', aucune: 'Aucune réservation trouvée avec ce numéro.',
    steps: [
      { icon: '📩', label: 'Demande reçue', desc: 'Votre demande a été enregistrée' },
      { icon: '📞', label: 'Contactée', desc: 'Un conseiller vous a contacté' },
      { icon: '✅', label: 'Finalisée', desc: 'Réservation confirmée' },
    ],
    enCours: 'EN COURS',
  },
  detail: {
    description: '📝 Description', equipements: '⚙️ Équipements & Options', plusPhotos: '📸 Plus de photos',
    reserver: '📅 Prendre rendez-vous', acheterOccasion: '🛒 Acheter / visiter', vendu: '🚫 Véhicule vendu', prix: 'Prix', video: '🎬 Voir la vidéo',
  },
  finance: {
    titre: '💰 Simulateur de financement',
    desc: 'Simulation illustrative au taux annuel indicatif de 7 %, hors assurance et frais. Ce calcul ne constitue pas une offre de crédit : les conditions sont à confirmer auprès d’un organisme de financement.',
    apport: 'Apport initial', duree: 'Durée du financement', montantFinance: 'Montant financé', mensualite: 'Mensualité estimée', mois: 'mois',
  },
}

export const ar = {
  nav: { accueil: 'الرئيسية', stock: 'مخزوننا', showroom: 'صالة العرض', suivi: 'تتبع الطلب', whatsapp: 'واتساب', occasion: 'شراء سيارة مستعملة', venteEchange: 'بيع / مبادلة' },
  hero: {
    eyebrow: 'استيراد مباشر: فرنسا · ألمانيا · العالم',
    titre1: 'سيارتك القادمة', titre2: 'قادمة من أوروبا',
    desc: (nom, adresse) => `اكتشف السيارات الجديدة والمستعملة المتوفرة لدى ${nom}، في ${adresse}.`,
    voirStock: '🚗 عرض المخزون', visiterShowroom: '📍 زيارة صالة العرض',
  },
  trust: { stock: 'سيارات جديدة ومستعملة', vente: 'شراء وبيع السيارات', reprise: 'استبدال ومبادلة السيارات', accompagnement: 'مرافقة في صالة العرض' },
  catalogue: {
    titre: 'كتالوجنا',
    desc: 'اكتشف مجموعتنا من السيارات الجديدة والمستعملة. الأسعار بالدينار الجزائري.',
    etat: 'حالة السيارة', tousEtats: 'كل الحالات', occasion: 'مستعملة', neuf: 'جديدة',
    toutesCategories: 'كل السيارات', neufs: 'السيارات الجديدة', occasions: 'السيارات المستعملة',
    rechercher: '🔍 ابحث عن موديل...', toutesMarques: 'كل الماركات', toutesOrigines: 'كل المنشأ',
    toutBudget: 'كل الميزانيات', budgetLow: 'أقل من 4,000,000 دج', budgetMid: '4,000,000 – 7,000,000 دج', budgetHigh: 'أكثر من 7,000,000 دج',
    triDefaut: 'الترتيب الافتراضي', prixCroissant: 'السعر تصاعديًا', prixDecroissant: 'السعر تنازليًا',
    anneeRecent: 'السنة (الأحدث)', anneeAncien: 'السنة (الأقدم)', kmMoins: 'الكيلومترات (الأقل)',
    chargement: 'جارٍ تحميل المخزون…', aucunVehiculeLigne: 'لا توجد سيارات متاحة حاليًا.', aucunCorrespond: 'لا توجد سيارة تطابق معاييرك.',
  },
  card: { reserver: 'حجز موعد', acheterOccasion: 'شراء / معاينة', vendu: 'تم البيع', neuf: 'جديدة / 0 كم', nouveau: '🆕 جديد' },
  showroom: { titre: 'زوروا صالة العرض', adresse: 'العنوان', telephone: 'الهاتف / واتساب', horaires: 'أوقات العمل', itineraire: '🧭 المسار (خرائط جوجل)' },
  footer: { droits: 'جميع الحقوق محفوظة.', suivre: '📦 تتبع حجزي' },
  statut: { disponible: '✅ متوفرة', reserve: '⏳ محجوزة', vendu: '🚫 مباعة' },
  reservation: {
    titre: 'طلب معاينة خاصة', sousTitre: 'اختر الموعد المناسب، سيستقبلك مستشارنا شخصيًا.',
    nom: 'اسمك *', nomPh: 'الاسم الكامل', tel: 'الهاتف *', telPh: '0550 12 34 56',
    date: 'التاريخ / الموعد المفضل (اختياري)', datePh: 'مثال: هذا الأسبوع، في الصباح',
    message: 'رسالة (اختياري)', messagePh: 'أرغب في الحجز / الحصول على مزيد من المعلومات...',
    envoyer: '📩 إرسال الطلب', envoiEnCours: '⏳ جارٍ الإرسال...',
    envoye: 'تم إرسال الطلب!', merci: 'سيتواصل معك فريقنا قريبًا لتأكيد موعدك.',
    confirmerWA: 'سرّع الإجراء بالتأكيد عبر واتساب:', confirmerBtn: '💬 تأكيد عبر واتساب',
    fermer: 'إغلاق', erreur: 'حدث خطأ، يرجى المحاولة مرة أخرى.',
  },
  tracking: {
    titre: '📦 تتبع الحجز', desc: 'أدخل رقم حجزك (مثال: IA-XXXXXXXXXXXX)',
    vehicule: 'السيارة', prix: 'السعر', annulee: '❌ تم إلغاء هذا الحجز.', aucune: 'لم يتم العثور على حجز بهذا الرقم.',
    steps: [
      { icon: '📩', label: 'تم استلام الطلب', desc: 'تم تسجيل طلبك' },
      { icon: '📞', label: 'تم التواصل', desc: 'تواصل معك أحد المستشارين' },
      { icon: '✅', label: 'مكتملة', desc: 'تم تأكيد الحجز' },
    ],
    enCours: 'قيد التنفيذ',
  },
  detail: {
    description: '📝 الوصف', equipements: '⚙️ التجهيزات والخيارات', plusPhotos: '📸 المزيد من الصور',
    reserver: '📅 حجز موعد', acheterOccasion: '🛒 شراء / معاينة', vendu: '🚫 السيارة مباعة', prix: 'السعر', video: '🎬 مشاهدة الفيديو',
  },
  finance: {
    titre: '💰 محاكي التمويل',
    desc: 'محاكاة توضيحية بمعدل سنوي إرشادي 7٪، دون التأمين والرسوم. هذا الحساب ليس عرض تمويل، ويجب تأكيد الشروط لدى جهة التمويل.',
    apport: 'الدفعة الأولى', duree: 'مدة التمويل', montantFinance: 'المبلغ الممول', mensualite: 'القسط الشهري المقدر', mois: 'شهر',
  },
}

export function statutLabel(key, lang) {
  const t = lang === 'ar' ? ar : fr
  return t.statut[key] || key
}
