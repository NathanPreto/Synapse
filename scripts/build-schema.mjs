// Gera supabase.sql (esquema completo, idempotente) concatenando supabase/migrations/*.sql em ordem.
// Uso: npm run build:schema
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'supabase', 'migrations');
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
let out =
  '-- ARQUIVO GERADO por `npm run build:schema` — não edite à mão.\n' +
  '-- Edite os arquivos em supabase/migrations/ e gere novamente.\n' +
  '-- Todo o conteúdo é idempotente: pode ser colado inteiro no SQL Editor do Supabase,\n' +
  '-- tanto em um projeto novo quanto em um projeto existente.\n' +
  '-- Nunca coloque service_role/secret key neste arquivo.\n';
for (const f of files) out += `\n-- ===== ${f} =====\n` + readFileSync(join(dir, f), 'utf8').trimEnd() + '\n';
writeFileSync(join(root, 'supabase.sql'), out);
console.log(`supabase.sql gerado a partir de ${files.length} migrações.`);
