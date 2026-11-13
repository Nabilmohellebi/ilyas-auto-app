# Installer une copie pour un nouveau garage

Ce dépôt est le modèle de référence. Pour chaque garage, crée une copie indépendante du code, une base Supabase indépendante et un projet Vercel indépendant. Cela permet de revendre et de personnaliser le même produit sans mélanger les données des clients.

## 1. Créer la copie du garage

1. Depuis GitHub, importe ou duplique ce dépôt dans le compte GitHub du garage (ou dans un dépôt privé dédié à ce client).
2. Ne connecte pas plusieurs garages au même dépôt si tu veux pouvoir personnaliser leur code indépendamment.
3. Dans Vercel, connecte le nouveau dépôt et crée un nouveau projet.
4. Garde le projet Vercel au nom temporaire pendant la configuration.

Chaque copie doit avoir son propre projet Supabase. Ne réutilise jamais le projet Supabase d'un autre garage : véhicules, contacts, réservations, photos et finances doivent rester séparés.

## 2. Créer la base Supabase

1. Crée un projet sur [Supabase](https://supabase.com).
2. Ouvre **SQL Editor**.
3. Exécute le fichier `supabase/schema.sql` de cette copie.
4. Ouvre `supabase/SET_ADMIN_PASSWORD.sql`, remplace le texte de remplacement par un mot de passe privé d'au moins 16 caractères, puis exécute le script.
5. Exécute ensuite `supabase/migrations/20261113001800_harden_public_policies_admin_only.sql`.

L'ordre est important : le script de mot de passe prépare la table de credentials, puis la migration crée les fonctions de session et applique les règles d'accès privées. Une fois les scripts terminés, le compte admin par mot de passe est prêt.

Récupère ensuite **Project URL** et **anon public key** depuis **Project Settings → API**.

## 3. Configurer les variables Vercel

Dans le projet Vercel du garage, va dans **Settings → Environment Variables** et ajoute ces variables pour **Production** (et Preview si tu utilises aussi les previews) :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase du garage |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon du projet Supabase |
| `SUPABASE_URL` | La même URL Supabase (utilisée par la fonction serveur) |
| `SUPABASE_ANON_KEY` | La même clé anon (utilisée uniquement pour valider la session admin côté serveur) |
| `VERCEL_RENAME_TOKEN` | Jeton API Vercel privé autorisé à modifier le projet |
| `VERCEL_RENAME_PROJECT_ID` | Identifiant du projet Vercel du garage |
| `VERCEL_RENAME_TEAM_ID` | Identifiant d'équipe Vercel si le projet appartient à une Team ; laisse cette variable absente pour un compte personnel |
| `TELEGRAM_BOT_TOKEN` | Facultatif : jeton du bot Telegram du garage |
| `TELEGRAM_CHAT_ID` | Facultatif : identifiant du chat Telegram du garage |

### Où trouver les valeurs Vercel

- **Project ID** : dans les paramètres généraux du projet Vercel.
- **Team ID** : dans les paramètres de l'équipe si le projet est dans une Team.
- **Token** : crée un token dans les paramètres de ton compte Vercel, avec le droit de lire et modifier le projet concerné.

Marque `VERCEL_RENAME_TOKEN` comme **Sensitive** lorsque l'option est proposée. Ne mets jamais ce jeton dans une variable `VITE_*`, dans GitHub, dans Supabase ou dans un composant React. La fonction `api/rename-project.js` ne le lit que côté serveur.

Après avoir ajouté ou modifié les variables, redéploie le projet pour que les fonctions serveur les prennent en compte.

## 4. Personnaliser le garage et son adresse

1. Ouvre `https://LE-PROJET.vercel.app/#admin`.
2. Connecte-toi avec le mot de passe défini dans Supabase.
3. Va dans **Paramètres → Informations du showroom**.
4. Renseigne le nom commercial, les téléphones, WhatsApp, l'adresse, les horaires et la carte.
5. Clique sur **Sauvegarder**.

La fonction serveur vérifie d'abord la session administrateur dans Supabase, puis demande à Vercel de renommer le projet et d'associer un domaine de production au format `nom-du-garage.vercel.app`.

Les caractères accentués sont normalisés et les espaces deviennent des tirets. Les sous-domaines `.vercel.app` sont globaux : si le nom est déjà pris, la fonction essaie une variante avec un petit suffixe lié au projet. Elle ne supprime pas volontairement l'ancien domaine. Vérifie l'adresse renvoyée par le message de confirmation avant de la communiquer au client.

Le nom commercial est toujours enregistré dans Supabase même si le jeton Vercel n'est pas encore configuré. Dans ce cas, seul le changement d'adresse automatique reste désactivé.

## 5. Ce que chaque garage possède

- Son propre compte/projet Vercel et sa propre URL `.vercel.app`.
- Sa propre base Supabase et ses propres photos.
- Son propre mot de passe admin.
- Ses propres téléphones, WhatsApp, adresse, horaires et annonces.
- Son propre bot Telegram si les notifications Telegram sont activées.

Pour mettre à jour le produit, teste d'abord les changements sur une copie de développement puis répercute-les sur les copies clients selon leur contrat de maintenance. Ne pousse pas un changement client-spécifique dans le modèle de référence.

## 6. Limite importante sur l'offre gratuite Vercel

Le domaine `.vercel.app` est fourni sans achat d'un nom de domaine. En revanche, les conditions Vercel réservent le forfait **Hobby gratuit** à un usage personnel et non commercial. Un site vitrine exploité par un garage pour son activité commerciale ne doit donc pas être présenté comme une installation conforme au forfait Hobby. Vérifie le plan autorisé par Vercel pour chaque client (notamment Pro pour un usage professionnel), ou choisis un hébergeur dont l'offre gratuite autorise explicitement cet usage.

Référence : [Conditions Vercel](https://vercel.com/legal/terms) et [tarifs Vercel](https://vercel.com/pricing).
