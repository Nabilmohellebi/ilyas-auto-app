# HBR AUTO — Site complet

Site de vente de véhicules : panel admin + vitrine publique bilingue FR/AR.
Architecture React + Vite + Supabase + Vercel, thème rouge/noir sport.

## 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. **SQL Editor** → colle le contenu de `supabase/schema.sql` → **Run**
3. Récupère `Project URL` et `anon public key` dans **Settings → API**

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_PASSWORD`
- `VITE_WA_NUMBER`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (optionnel)

## 3. Déploiement

Pousse **tout le contenu de ce dossier** (pas le dossier lui-même, son contenu) à la racine
de ton repo GitHub, connecte le repo à Vercel, Framework preset = Vite, ajoute les variables
d'environnement ci-dessus, Deploy.

## 4. Accès admin

`https://tonsite.vercel.app/#admin` — mot de passe par défaut celui de `VITE_ADMIN_PASSWORD`
(modifiable ensuite dans Admin → Paramètres).

## 5. En local

```bash
npm install
npm run dev
```
