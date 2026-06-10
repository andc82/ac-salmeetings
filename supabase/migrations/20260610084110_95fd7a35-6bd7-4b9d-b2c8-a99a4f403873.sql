ALTER TABLE public.profiles ADD COLUMN username text NOT NULL DEFAULT '';
UPDATE public.profiles SET username = 'vash' WHERE email = 'and.cervi@gmail.com';