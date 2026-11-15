-- Let administrators show or hide the financing calculator per vehicle.
-- Existing and new vehicles default to showing the calculator.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS financing_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.vehicles.financing_enabled IS
  'Whether the financing calculator is displayed on this vehicle detail page.';

-- Financing visibility is managed per vehicle, so this setting is no longer public.
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
    'site_theme'
  ])
  OR (SELECT private.hbr_admin_session_valid())
);

DELETE FROM public.settings WHERE key = 'show_financing_calculator';
