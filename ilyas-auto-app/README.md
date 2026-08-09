# ILYAS AUTO — Phase 1 : Panel Admin

Base du site de vente de véhicules, architecture React + Vite + Supabase
(comme ton site Wazyo), thème rouge/noir sport.

**Ce qui est fait dans cette phase :**
- ✅ Panel admin complet (connexion, gestion des véhicules, réservations, paramètres)
- ✅ Upload + compression automatique des photos
- ✅ Statut véhicule (Disponible / Réservé / Vendu)
- ✅ Notifications Telegram (via proxy sécurisé `/api/telegram`)
- ✅ Changement de mot de passe admin
- ⏳ Le site public (grille véhicules, fiche détail, formulaire de réservation) arrive à l'étape suivante — une page d'attente avec bouton WhatsApp s'affiche pour l'instant.

## 1. Mettre en place Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** → collez le contenu de `supabase/schema.sql` → **Run**
3. Récupérez `Project URL` et `anon public key` dans **Settings → API**

## 2. Variables d'environnement

Copiez `.env.example` en `.env` (local) et remplissez, ou ajoutez-les directement
dans **Vercel → Settings → Environment Variables** :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_PASSWORD` (mot de passe admin par défaut, changeable ensuite dans le panel)
- `VITE_WA_NUMBER`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (optionnel, pour les notifications)

## 3. GitHub + Vercel

```bash
git init
git add .
git commit -m "Ilyas Auto — phase 1 : panel admin"
git branch -M main
git remote add origin https://github.com/<votre-compte>/ilyas-auto.git
git push -u origin main
```

Sur [vercel.com](https://vercel.com) : **Add New Project** → importez le dépôt →
Framework preset **Vite** (auto-détecté) → ajoutez les variables d'environnement → **Deploy**.

## 4. Accéder au panel admin

Une fois déployé : `https://votre-site.vercel.app/#admin`
Mot de passe par défaut : `ilyas2026` (à changer immédiatement dans **Paramètres**).

## 5. En local

```bash
npm install
npm run dev
```
