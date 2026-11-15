-- Store a flexible, vehicle-specific technical specification table.
-- Existing equipment options remain in the existing "specs" JSONB column.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS technical_specs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_technical_specs_array_check;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_technical_specs_array_check
  CHECK (jsonb_typeof(technical_specs) = 'array');

COMMENT ON COLUMN public.vehicles.technical_specs IS
  'Flexible list of technical specification rows, each containing a label and value.';
