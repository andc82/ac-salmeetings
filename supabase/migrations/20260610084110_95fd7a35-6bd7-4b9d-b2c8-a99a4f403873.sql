ALTER TABLE public.profiles ADD COLUMN username text NOT NULL DEFAULT '';
-- Admin username seed removed; applied out-of-band to avoid committing the admin email.