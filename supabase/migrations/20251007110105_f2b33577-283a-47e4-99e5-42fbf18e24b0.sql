-- Move unaccent extension to extensions schema (best practice)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;