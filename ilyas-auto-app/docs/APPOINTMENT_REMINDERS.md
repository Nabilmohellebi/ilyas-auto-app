# Rappels automatiques des rendez-vous

Les rappels sont envoyés au compte ou groupe Telegram du showroom :

- 24 heures avant le rendez-vous ;
- environ 1 heure avant le rendez-vous.

Le planificateur Supabase vérifie les créneaux réservés toutes les cinq minutes. Les heures sont formatées en heure d'Algérie. Un registre privé évite les doublons et permet de retenter les notifications échouées.

## Configuration Telegram (à faire une seule fois)

### 1. Créer le bot

1. Ouvrir Telegram et chercher **@BotFather**.
2. Envoyer **/newbot** et suivre les instructions.
3. Copier le jeton du bot fourni par BotFather.
4. Ouvrir le nouveau bot et lui envoyer **/start**.

Pour un groupe, ajouter le bot au groupe et récupérer l'identifiant du groupe au lieu de son identifiant personnel.

### 2. Ajouter les variables dans Vercel

Dans le projet **auto-nabil-6p5fn**, ouvrir **Settings → Environment Variables** et ajouter ces deux variables pour **Production** :

| Nom | Valeur |
|---|---|
| TELEGRAM_BOT_TOKEN | Le jeton fourni par BotFather |
| TELEGRAM_CHAT_ID | L'identifiant du chat ou du groupe Telegram |

Ne jamais ajouter ces valeurs dans le code ou dans GitHub. Le jeton doit rester une variable sensible côté serveur.

La variable CRON_SECRET est déjà créée côté Vercel par le déploiement du système ; ne pas la modifier.

Après avoir ajouté les deux variables Telegram, redéployer le projet en Production. Les notifications Telegram des nouvelles demandes et les rappels de rendez-vous utiliseront alors le même bot.

### 3. Secret de liaison Supabase → Vercel

Le planificateur utilise Supabase Vault pour stocker le secret partagé qui autorise les appels du planificateur vers Vercel. Ce secret est créé lors de la mise en service ; il n'est pas nécessaire de le saisir manuellement.

Les valeurs TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID restent uniquement dans les variables sensibles de Vercel. Elles ne sont pas stockées dans la base de données.

## Vérification

Après configuration, crée un créneau de test à plus de 24 heures, réserve-le depuis le site et vérifie le message Telegram au moment du premier rappel. Le registre des tentatives se trouve dans le schéma privé private de Supabase ; il n'est pas accessible depuis le site public.
