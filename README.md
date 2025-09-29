# Sistema Modular - Portal Digital

Proyecto de ejemplo en HTML/CSS/JS vanilla que implementa un flujo de autenticación sencillo contra Supabase. Está organizado de forma modular para facilitar la futura incorporación de nuevos componentes.

## Requisitos previos

- Navegador moderno con soporte para módulos ES.
- Acceso a Internet (se consumen dependencias desde CDN y se conecta a Supabase).

## Cómo ejecutar el proyecto

1. Clona o descarga este repositorio.
2. Abre la carpeta raíz del proyecto (`Portal-Digital-Pymess`) en tu editor.
3. Inicia un servidor estático desde la raíz, por ejemplo con la extensión **Live Server** de VS Code o con `npx serve`.
4. Navega a `http://localhost:PORT/index.html` (sustituye `PORT` por el puerto real del servidor).

> **Despliegue en GitHub Pages:** al estar `index.html` en la raíz, activa GitHub Pages desde la rama principal y selecciona el modo "Deploy from a branch" apuntando a `/(root)`.

> **Tip:** Si usas Live Server, haz clic derecho sobre `index.html` en la raíz y selecciona **Open with Live Server**.

## Configuración de Supabase

El proyecto ya incluye la configuración necesaria en `lib/supabaseClient.js` con las credenciales públicas proporcionadas:

```js
const SUPABASE_URL = "https://jsjwgjaprgymeonsadny.supabase.co";
const SUPABASE_ANON_KEY = "<clave_anon>";
```

La tabla `public.usuarios` debe existir con el esquema:

```sql
CREATE TABLE public.usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

## Estructura del proyecto

```
/ (raíz del repositorio)
  README.md
  index.html                # Portada del sistema
  /public/
    /css/
      global.css           # Estilos compartidos
  /lib/
    authGuard.js           # Gestión de sesión y protección de rutas
    pathUtil.js            # Helper para resolver rutas relativas
    supabaseClient.js      # Cliente único de Supabase
  /modules/
    /auth/
      login.html
      register.html
      /css/
        login.css
        register.css
      /js/
        login.js
        register.js
    /dashboard/
      index.html
      /css/
        dashboard.css
      /js/
        dashboard.js
    /costos/
      index.html
      /css/
        costos.css
      /js/
        costos.js
    /estrategias/
      index.html
      /css/
        estrategias.css
      /js/
        charts.js
        constants.js
        estrategias.js
        persistence.js
        stateManager.js
        validation.js
```

Cada módulo cuenta con sus propias carpetas de estilos y scripts, lo que facilita el mantenimiento y la escalabilidad.

## Guía de flujos principales

### Portada (Index)

- Presenta la bienvenida con descripción de módulos y un carrusel de KPIs animado que rota cada 6 segundos.
- Incluye un micro-formulario para solicitar la demo; los correos se validan y se almacenan en la tabla `leads_demo` de Supabase.
- Muestra indicadores de confianza (Supabase secure, Cifrado, RLS) con tooltips accesibles.
- Los estilos siguen un look glassmorphism con tipografía Poppins e interacciones suaves.

### Registro

1. Accede a `/modules/auth/register.html`.
2. Completa usuario y contraseña (mínimo 8 caracteres) mientras observas el medidor de fortaleza y la disponibilidad del usuario en vivo.
3. Al enviar, la contraseña se hashea con `bcrypt.hashSync` antes de enviarse a Supabase.
4. Se valida que el usuario no exista (`checkUsernameAvailability`) y se inserta el nuevo registro en `public.usuarios`.
5. Se muestra confirmación, beneficios posteriores y enlaces legales.

### Inicio de sesión

1. Accede a `/modules/auth/login.html`.
2. Ingresa usuario y contraseña.
3. El formulario deshabilita controles, muestra un spinner y valida las credenciales contra Supabase comparando el hash almacenado con `bcrypt.compare`.
4. Activa "Recordarme" para guardar la sesión en `localStorage`. De lo contrario se usa `sessionStorage`.
5. Tras autenticación exitosa se muestra un mensaje accesible y se redirige al Dashboard.

### Dashboard y módulos

- El Dashboard muestra un saludo personalizado, widgets accionables (estado de cuenta, tareas, próximas actualizaciones, último acceso) y accesos rápidos a perfil, notificaciones y ayuda.
- Cada tarjeta utiliza rutas relativas (`../costos/index.html`, `../estrategias/index.html`) para evitar errores 404 en entornos estáticos y luce badges dinámicos (Nuevo, En beta, Actualizado).
- Ambos módulos se encuentran protegidos por `requireAuth()` para asegurar que solo usuarios autenticados puedan navegar.
- El módulo **Estrategias de Ventas** incorpora un asistente de 15 pasos con validaciones, guardado automático en `localStorage` y sincronización con Supabase.

### Estrategias de Marketing

El asistente guía al usuario por etapas de diagnóstico y planificación:

- **Perfil corporativo, audiencia y buyer persona:** captura datos obligatorios con validaciones contextuales y permite registrar arquetipos detallados.
- **Competencia y matriz SWOT:** agrega competidores, propuestas de valor y fortalezas/debilidades almacenadas por categoría.
- **Plan táctico y calendario editorial:** define responsables, dependencias, costos y programación semanal con canal y hora.
- **Campañas, automatizaciones, KPIs y tracking mensual:** calcula variaciones contra la meta, muestra tendencias y renderiza gráficas con Chart.js.
- **Reporte ejecutivo:** ofrece acciones para guardar en Supabase, descargar un PDF generado con jsPDF, compartir por correo o volver al Dashboard.

Los datos se guardan en Supabase respetando una tabla por entidad (ver sección siguiente) y también se conservan en `localStorage` para permitir la reanudación sin conexión. Cada función del módulo está documentada con comentarios según el estilo solicitado.

### Logout

- El botón **Cerrar sesión** ejecuta `authGuard.logout()`, eliminando cualquier sesión almacenada y redirigiendo al login.

## Riesgos y recomendaciones

- **Hashing en el cliente:** la contraseña se hashea en el navegador antes de enviarse a Supabase. Esto protege la clave en tránsito, pero no sustituye un backend seguro. Un atacante podría inspeccionar el código y enviar hashes directamente.
- **Recomendación futura:** utilizar **Supabase Auth** o funciones **Edge** para realizar el hashing y validación en el servidor, reduciendo la exposición y centralizando la lógica crítica de autenticación.

## Dependencias externas

- [@supabase/supabase-js](https://supabase.com/docs/reference/javascript/installing) cargado vía CDN (ESM).
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) cargado vía CDN en formato ESM.

## Pruebas unitarias

El proyecto incorpora pruebas unitarias con [Vitest](https://vitest.dev/) para los flujos de **Login** y **Registro**. Para
ejecutarlas:

```bash
npm install
npm test
```

Estas pruebas simulan el DOM con **jsdom**, validan la lógica de validación de formularios, la interacción con Supabase y la
generación de mensajes de retroalimentación al usuario.

## Tablas adicionales de Supabase

El asistente de estrategias utiliza tablas específicas para separar cada entidad de negocio. El archivo [`supabase-schema.sql`](./supabase-schema.sql) incluye las sentencias `CREATE TABLE` recomendadas para:

- Estrategias maestras (`marketing_strategies`).
- Perfil corporativo (`marketing_company_profiles`).
- Audiencias y buyer personas (`marketing_audiences`, `marketing_buyer_personas`).
- Objetivos, canales y presupuesto (`marketing_objectives`, `marketing_channels`, `marketing_budgets`).
- Cronograma y plan táctico (`marketing_timeline_activities`).
- Calendario editorial (`marketing_calendar_entries`).
- KPIs y resultados mensuales (`marketing_kpis`, `marketing_kpi_results`).
- Competidores y matriz SWOT (`marketing_competitors`, `marketing_swot_entries`).
- Campañas y automatizaciones (`marketing_campaigns`, `marketing_automations`).
- Bitácora de versiones (`marketing_version_logs`).
- Leads captados desde la portada (`leads_demo`).

Ejecuta el script desde el panel SQL de Supabase o mediante `psql` antes de utilizar el módulo para asegurar la persistencia completa.

## Próximos pasos sugeridos

- Implementar módulos adicionales (por ejemplo, Finanzas, Reportes).
- Añadir manejo de roles/permiso avanzados en `authGuard`.
- Integrar formularios y datos reales en el módulo de Costos.
- Extender las pruebas automáticas y preparar un pipeline de despliegue continuo.
