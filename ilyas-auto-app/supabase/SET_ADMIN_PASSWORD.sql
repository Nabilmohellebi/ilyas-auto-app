-- HBR AUTO — Initialiser le mot de passe administrateur.
--
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Remplace le texte entre apostrophes par un mot de passe personnel de
-- 16 caractères minimum. Ne l'envoie pas dans une conversation.
--
-- Le mot de passe est immédiatement transformé en hash bcrypt.
-- Le mot de passe en clair n'est ni stocké dans la base, ni dans GitHub.

do $setup$
declare
  chosen_password text := 'REMPLACE_CE_TEXTE_PAR_TON_MOT_DE_PASSE';
begin
  if chosen_password = 'REMPLACE_CE_TEXTE_PAR_TON_MOT_DE_PASSE'
     or length(chosen_password) < 16 then
    raise exception 'Remplace le texte par un mot de passe personnel de 16 caractères minimum.';
  end if;

  insert into private.hbr_admin_credentials (singleton, password_hash, updated_at)
  values (
    true,
    extensions.crypt(chosen_password, extensions.gen_salt('bf', 12)),
    now()
  )
  on conflict (singleton) do update
    set password_hash = excluded.password_hash,
        updated_at = now();

  delete from private.hbr_admin_sessions;
  delete from private.hbr_admin_login_attempts;
end;
$setup$;

-- Une fois ce script exécuté, exécuter ensuite :
-- supabase/migrations/20261113001800_harden_public_policies_admin_only.sql
