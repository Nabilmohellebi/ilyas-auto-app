-- Allow public pages to read the single non-sensitive financing visibility switch.
-- All writes remain protected by the existing valid admin-session policy.
DROP POLICY IF EXISTS "public read safe settings" ON public.settings;

CREATE POLICY "public read safe settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (
  key = ANY (ARRAY[
    'shop_name', 'shop_phone', 'shop_whatsapp', 'shop_email', 'shop_address',
    'shop_horaires', 'shop_maps_url', 'shop_maps_embed', 'shop_phones',
    'brand_identity', 'hero_images', 'maintenance', 'trade_margin_percent',
    'site_theme', 'show_financing_calculator'
  ])
  OR (SELECT private.hbr_admin_session_valid())
);
