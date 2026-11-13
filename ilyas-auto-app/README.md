# Modèle de site automobile — Nabil Auto

Application React + Vite + Supabase conçue pour être copiée et personnalisée pour chaque garage automobile.

## Démarrage d'une nouvelle installation

Lis le guide complet **[CLIENT_TEMPLATE_SETUP.md](./CLIENT_TEMPLATE_SETUP.md)** avant le premier déploiement. Il décrit la création d'une base Supabase indépendante, la configuration du projet Vercel, le mot de passe administrateur et le changement automatique du nom de projet et du domaine `.vercel.app`.

## Développement local

```bash
npm install
npm run dev
npm run build
```

## Architecture

- Vitrine publique bilingue français / arabe.
- Gestion indépendante du stock neuf et occasion.
- Réservation, achat, vente, reprise et échange.
- CRM, suivi des demandes et registre financier privé.
- Supabase pour les données et les photos.
- Fonctions serveur Vercel pour Telegram et le renommage du projet.

**Important :** chaque garage doit avoir son propre projet Supabase et son propre projet Vercel. Ne partage pas une base de données entre plusieurs garages. Les jetons Vercel et Telegram doivent rester dans les variables d'environnement serveur, jamais dans le code client.
