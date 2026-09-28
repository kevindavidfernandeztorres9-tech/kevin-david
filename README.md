# Dwell en tiempo real

Mide cuánto tiempo pasan tus visitantes en cada sección de tus landing pages
(Shopify u otra web) y te marca el **cuello de botella**: la sección donde más
gente se va. Funciona con varias tiendas a la vez y se abre desde cualquier
laptop o celular.

- **Supabase** guarda las visitas.
- **Vercel** publica el panel y el script de seguimiento.
- **Shopify** carga una línea de código en la tienda **airmaggnature** (la app es solo para esa tienda).

## 1. Supabase (una vez)

1. Entra a tu proyecto → **SQL Editor** → **New query**.
2. Pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Vercel (una vez)

**Opción rápida:** pulsa este botón, entra con GitHub y rellena las variables:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkevindavidfernandeztorres9-tech%2Fkevin-david&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,DASHBOARD_PASSWORD&envDescription=Datos%20de%20Supabase%20y%20contrasena%20del%20panel&project-name=dwell-tiendas)

**O a mano:**

1. Entra a <https://vercel.com> con tu cuenta de GitHub.
2. **Add New → Project** → importa este repositorio (`kevin-david`).
3. En **Environment Variables** agrega:

   | Nombre | Valor |
   |---|---|
   | `SUPABASE_URL` | la Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clave service_role |
   | `DASHBOARD_PASSWORD` | la contraseña que quieras para el panel |
   | `ALLOWED_HOSTS` | *(opcional)* dominios de tus tiendas separados por coma, p. ej. `airmaggnature.myshopify.com,www.tudominio.com` |

4. Pulsa **Deploy**. Te dará una dirección como `https://dwell-xxx.vercel.app`.

## 3. Shopify (airmaggnature)

**Tienda online → Temas → ⋯ → Editar código → `layout/theme.liquid`** y pega
justo antes de `</head>`:

```html
<script src="https://dwell-xxx.vercel.app/dwell.js" data-store="airmaggnature" defer></script>
```

- Cambia `dwell-xxx.vercel.app` por tu dirección de Vercel.
- No cambies `data-store`: la app solo acepta datos de `airmaggnature`.
- Las secciones del tema se detectan solas. Para medir un bloque concreto con
  un nombre propio, agrégale `data-dwell="Nombre"`.

## 4. Usarlo

Abre `https://dwell-xxx.vercel.app` desde cualquier laptop, entra con tu
contraseña y elige tienda y rango. El panel se actualiza solo cada 15 s.

| Métrica | Qué significa |
|---|---|
| Dwell mediano | tiempo activo (pestaña visible) en la página |
| Rebote | visitas de menos de 10 s |
| La vieron | % de visitas que llegaron a esa sección |
| Tiempo mediano | cuánto estuvo esa sección en pantalla |
| Se fueron aquí | % de visitas cuya última sección fue esa |
| ⚠ Cuello de botella | la sección (sin contar la última) donde más gente se va |

En Windows puedes usar `Abrir_Dwell_en_Tiempo_Real.bat`: edítalo una vez con
tu dirección de Vercel y ábrelo con doble clic.

## App de escritorio (Windows)

`descargas/DwellAirmagg.zip` trae la app en Java (misma información que el panel web,
con tema oscuro y "Mis landings" en vivo). Descomprímela y abre
`Abrir_Dwell_Airmagg.bat`; te pide la contraseña del panel. Necesita Java 17+.

Para recompilarla: `desktop/build.sh` (genera `desktop/dist/DwellAirmagg.zip`).

## Desarrollo local

```bash
cp .env.example .env.local   # rellena los valores
npm install
npm run dev
```
