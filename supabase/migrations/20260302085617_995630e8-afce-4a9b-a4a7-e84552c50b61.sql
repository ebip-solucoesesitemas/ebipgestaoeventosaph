
ALTER TABLE public.events
ADD COLUMN min_antes_saida_base integer DEFAULT NULL,
ADD COLUMN horario_saida_base timestamp with time zone DEFAULT NULL;
