# Presupuesto Familiar

App web para llevar el presupuesto de casa entre dos personas: presupuesto por categorías, carga de gastos reales, comparativa presupuesto vs real y entre meses.

- **Grupos:** Ingresos · Gastos fijos · Gastos variables · Deudas (con saldo pendiente) · Ahorro y gastos futuros (con metas).
- **Compartida:** cada uno con su cuenta; lo que carga uno lo ve el otro al instante.
- **Instalable en el móvil** (Añadir a pantalla de inicio).

Tecnología: React + Vite, base de datos y login con Supabase, publicada en Vercel.

## Puesta en marcha

1. **Supabase → SQL Editor → New query:** pega `supabase/schema.sql` y pulsa *Run* (una sola vez).
2. **Vercel → Add New → Project:** importa este repositorio. Antes de *Deploy*, en *Environment Variables* añade:
   - `VITE_SUPABASE_URL` → Supabase → Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` → la clave **anon / publishable** (nunca la `service_role`)
3. **Supabase → Authentication → URL Configuration:** pon como *Site URL* la dirección que te da Vercel (p. ej. `https://presupuesto-familiar.vercel.app`).
4. Entra en la web, crea tu cuenta y tu hogar. En la pestaña **Hogar** está el código para invitar a tu pareja.

## Desarrollo local

```bash
cp .env.example .env.local   # y rellena las dos variables
npm install
npm run dev
```
