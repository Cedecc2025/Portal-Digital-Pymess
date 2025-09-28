# Sistema Modular - Portal Digital

Proyecto de ejemplo en HTML/CSS/JS vanilla que implementa un flujo de autenticación sencillo contra Supabase. Está organizado de forma modular para facilitar la futura incorporación de nuevos componentes.

## Requisitos previos

- Navegador moderno con soporte para módulos ES.
- Acceso a Internet (se consumen dependencias desde CDN y se conecta a Supabase).

## Cómo ejecutar el proyecto

1. Clona o descarga este repositorio.
2. Abre la carpeta `sistema-modular` en tu editor.
3. Inicia un servidor estático, por ejemplo con la extensión **Live Server** de VS Code o con `npx serve`.
4. Navega a `http://localhost:PORT/sistema-modular/index.html` (sustituye `PORT` por el puerto real del servidor).

> **Tip:** Si usas Live Server, haz clic derecho sobre `index.html` y selecciona **Open with Live Server**.

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
/sistema-modular/
  README.md
  index.html                # Portada del sistema
  /public/
    /css/
      global.css           # Estilos compartidos
  /lib/
    authGuard.js           # Gestión de sesión y protección de rutas
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
```

Cada módulo cuenta con sus propias carpetas de estilos y scripts, lo que facilita el mantenimiento y la escalabilidad.

## Guía de flujos principales

### Registro

1. Accede a `/modules/auth/register.html`.
2. Completa usuario y contraseña (mínimo 8 caracteres).
3. Al enviar, el password se hashea en el navegador con **bcryptjs** antes de enviarse a Supabase.
4. Se inserta el nuevo registro en `public.usuarios`.
5. Se muestra confirmación y un enlace para volver al login.

### Inicio de sesión

1. Accede a `/modules/auth/login.html`.
2. Ingresa usuario y contraseña.
3. Se valida la existencia del usuario en Supabase y se compara la contraseña con el hash almacenado.
4. Activa "Recordarme" para guardar la sesión en `localStorage`. De lo contrario se usa `sessionStorage`.
5. Tras autenticación exitosa se redirige al Dashboard.

### Dashboard y módulos

- El Dashboard muestra un saludo personalizado, ofrece un botón para cerrar sesión y la tarjeta del módulo **Costos**.
- La tarjeta navega a `/modules/costos/index.html`.
- El módulo de Costos es un placeholder y está protegido: requiere sesión activa para visualizarse.

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

## Próximos pasos sugeridos

- Implementar módulos adicionales (por ejemplo, Finanzas, Reportes).
- Añadir manejo de roles/permiso avanzados en `authGuard`.
- Integrar formularios y datos reales en el módulo de Costos.
- Extender las pruebas automáticas y preparar un pipeline de despliegue continuo.
