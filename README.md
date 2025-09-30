# Sistema Modular Empresarial (HTML/CSS/JS)

Este repositorio contiene un portal web modular desarrollado únicamente con HTML, CSS y JavaScript "vanilla". Implementa un flujo de autenticación profesional contra Supabase y organiza la aplicación en módulos independientes para facilitar el crecimiento del sistema.

## Requisitos previos

- Navegador moderno con soporte para ES Modules.
- Acceso a Internet para consumir el cliente de Supabase y `bcryptjs` desde CDN.
- La tabla `public.usuarios` creada en tu proyecto de Supabase:

```sql
CREATE TABLE public.usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

## Cómo ejecutar el proyecto

1. Clona el repositorio y abre la carpeta `Portal-Digital-Pymess` en tu editor.
2. Levanta un servidor estático desde la raíz (por ejemplo con la extensión **Live Server** de VS Code o `npx serve`).
3. Navega a `http://localhost:<PUERTO>/index.html`.
4. Para desplegar en GitHub Pages, publica la rama principal apuntando a la carpeta raíz del proyecto.

## Configuración de Supabase

El cliente de Supabase se inicializa en `lib/supabaseClient.js` con las credenciales públicas proporcionadas:

```js
const SUPABASE_URL = "https://jsjwgjaprgymeonsadny.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzandnamFwcmd5bWVvbnNhZG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY5NjQsImV4cCI6MjA3NDIxMjk2NH0.4fjXkdOCyaubZuVIZNeViaA6MfdDK-4pdH9h-Ty2bfk";
```

No es necesario exponer la contraseña de la base de datos; todo el consumo se realiza mediante el cliente público.

## Estructura del proyecto

```
Portal-Digital-Pymess/
├── README.md
├── index.html                     # Portada general del portal
├── public/
│   └── css/
│       └── base.css                # Estilos globales y tokens de diseño
├── lib/
│   ├── authGuard.js               # Gestión de sesión y protección de rutas
│   ├── pathUtil.js                # Helper para navegar entre módulos con rutas relativas
│   └── supabaseClient.js          # Cliente único de Supabase
├── modules/
│   ├── auth/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── css/
│   │   │   ├── login.css
│   │   │   └── register.css
│   │   └── js/
│   │       ├── login.js
│   │       └── register.js
│   ├── dashboard/
│   │   ├── index.html
│   │   ├── css/dashboard.css
│   │   └── js/dashboard.js
│   └── costos/
│       ├── index.html
│       ├── css/costos.css
│       └── js/costos.js
└── tests/
    ├── login.test.js
    └── register.test.js
```

Cada módulo mantiene sus propios estilos y scripts, facilitando la escalabilidad y el mantenimiento del código.

## Flujos principales

### Registro

1. Accede a `/modules/auth/register.html`.
2. Valida usuario (3-20 caracteres alfanuméricos, guion o guion bajo) y contraseña (≥ 8 caracteres).
3. El formulario muestra en vivo la disponibilidad del usuario y la fortaleza de la contraseña.
4. Al enviar, la contraseña se hashea con `bcrypt.hashSync` antes de insertarse en Supabase.
5. Se muestra un mensaje de éxito y se redirige al login.

### Inicio de sesión

1. Accede a `/modules/auth/login.html`.
2. Ingresa tus credenciales y decide si deseas activar "Recordarme".
3. Las credenciales se validan contra Supabase utilizando `bcrypt.compare`.
4. Según la opción elegida, la sesión se guarda en `localStorage` o `sessionStorage`.
5. Tras el éxito, se redirige al Dashboard.

### Dashboard

- Protegido mediante `requireAuth()`.
- Muestra un saludo personalizado y un único acceso directo al módulo de **Costos**.
- Incluye un botón de “Cerrar sesión” que elimina la sesión local y devuelve al login.

### Módulo de Costos

- Actualmente se presenta como un placeholder protegido por autenticación.
- Servirá como base para incorporar CRUD de productos, costos fijos y flujo de caja.

## Guardas y utilidades de sesión

`authGuard.js` expone:

- `isAuthenticated()` – indica si existe sesión almacenada.
- `requireAuth()` – redirige al login cuando no hay sesión activa.
- `saveSession(user, rememberMe)` – guarda la sesión en localStorage o sessionStorage.
- `logout()` – borra la sesión y redirige al login.
- `getCurrentUsername()` y `getCurrentUser()` – devuelven información de la sesión actual.

## Pruebas unitarias

El proyecto incluye pruebas con [Vitest](https://vitest.dev/) y jsdom para cubrir la lógica de login y registro.

```bash
npm install
npm test
```

Las pruebas mockean Supabase y `bcryptjs`, garantizando que las validaciones de formularios, el guardado de sesión y la navegación se comporten correctamente.

## Riesgos y recomendaciones

- **Hashing en el cliente:** la contraseña se hashea en el navegador antes de enviarse. Esto evita enviar texto plano, pero el hash podría ser reutilizado por un atacante. Para ambientes productivos se recomienda implementar Supabase Auth o funciones Edge que centralicen la lógica de autenticación.
- **Dependencia de red:** al cargar recursos desde CDN es necesario contar con conexión a Internet. Para entornos cerrados se sugiere empaquetar las dependencias localmente.

## Próximos pasos sugeridos

- Implementar el CRUD completo del módulo de Costos (productos, costos fijos y flujo de caja).
- Añadir más tarjetas en el Dashboard conforme se publiquen nuevos módulos.
- Incorporar roles y permisos granulares en el guard de autenticación.
- Automatizar despliegues y pruebas en un pipeline CI/CD.
