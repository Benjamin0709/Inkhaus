# Ink Haus — Plataforma Web Integral para Estudio de Tatuajes

**Proyecto de Título — INSW410 — Universidad Andrés Bello**
Autor: Benjamín Alexander Rojas Ponce

Plataforma web para un estudio de tatuajes: portafolio y perfiles de artistas, chatbot con cotización sobre un maniquí 3D, agenda de citas con disponibilidad en tiempo real, pago del abono con Webpay Plus, chat en vivo, notificaciones por correo y panel de administración.

---

## Funcionalidades

- **Cuentas y roles:** registro, inicio de sesión con JWT, recuperación y cambio de contraseña, edición de perfil.
- **Portafolio y artistas:** perfiles públicos, galería filtrable por artista y estilo, subida de piezas por los artistas.
- **Chatbot de cotización:** base de conocimiento (FAQ), selección de zona del cuerpo sobre un maniquí 3D (Three.js) y cotización según zona, tamaño y estilo. Las consultas sin respuesta quedan registradas para el equipo.
- **Chat en vivo:** conversaciones cliente ↔ artista o cliente ↔ equipo (bandeja de fallback del chatbot).
- **Citas:** disponibilidad por artista y fecha, validación de choques de horario, cancelación y reagendamiento.
- **Pagos:** abono de la cita con Webpay Plus (Transbank), calculado siempre en el servidor.
- **Correos (Nodemailer):** bienvenida, recuperación de contraseña, confirmación, cancelación y reagendamiento de citas, aviso al artista, confirmación de pago, formulario de contacto y recordatorio automático 3 días antes de la cita (cron diario a las 09:00).
- **Contenido informativo:** páginas de Proceso y Cuidados (con video administrable) y formulario de contacto.
- **Panel de administración:** usuarios, artistas, precios, estilos, reportes, mensajes de contacto y consultas del chatbot.

---

## Stack

| Capa     | Tecnologías |
|----------|-------------|
| Backend  | Node.js (ES Modules), Express 4, MongoDB + Mongoose, JWT, bcryptjs, Multer, Nodemailer, node-cron, Transbank SDK |
| Frontend | React 18, Vite, React Router 6, Tailwind CSS, Axios, Three.js |

---

## Estructura del proyecto

```
inkhaus/
├── backend/                  ← API REST (Node.js + Express + MongoDB)
│   ├── config/               ← database.js, mailer.js, webpay.js
│   ├── controllers/          ← Lógica de negocio (usuarios, estilos)
│   ├── middleware/           ← auth.js (JWT + roles), upload.js (Multer)
│   ├── models/               ← Schemas Mongoose
│   │   └── User, Artist, Appointment, Payment, Portfolio, Pricing, Style,
│   │       Conversation, Message, ContactMessage, ChatbotQuery, SiteContent
│   ├── routes/               ← Endpoints REST, uno por recurso
│   ├── services/
│   │   ├── abono.js          ← Cálculo del abono
│   │   ├── email.service.js  ← Envío de correos
│   │   ├── emailTemplates.js ← Plantillas HTML de correo
│   │   └── reminderCron.js   ← Recordatorios de citas (09:00 diario)
│   ├── uploads/              ← Imágenes y videos subidos (se crea solo, fuera de git)
│   └── server.js             ← Entry point
│
└── frontend/                 ← React 18 + Tailwind CSS (Vite)
    ├── public/models/        ← Maniquís 3D (.glb) del chatbot
    └── src/
        ├── api/              ← Llamadas axios a la API (una por recurso)
        ├── components/
        │   ├── auth/         ← PrivateRoute (protección por rol)
        │   ├── chatbot/      ← Widget, motor de conversación, visor 3D, zonas
        │   ├── layout/       ← Navbar, Footer
        │   ├── livechat/     ← Chat en vivo cliente / artista / equipo
        │   └── ui/           ← Calendar, ImageCarousel, BookingCTALink
        ├── constants/        ← Contenido de cuidados, precios base
        ├── context/          ← AuthContext (JWT global), LiveChatContext
        ├── pages/            ← Home, Auth, Account, Admin, Artists, Portfolio,
        │                       Payment, Process, Care, Contact
        └── utils/            ← Redirección a Webpay
```

---

## Requisitos previos

- Node.js >= 18
- MongoDB Atlas (o MongoDB local)
- Cuenta Gmail con **contraseña de aplicación** para el envío de correos
- (Opcional para producción) Credenciales de comercio de Transbank. En desarrollo se usa el ambiente de integración, sin credenciales.

---

## Configuración

### Variables de entorno del backend

Crea el archivo `backend/.env` (está en `.gitignore`, no lo subas al repositorio):

```env
# Servidor
PORT=8080
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8080

# Base de datos
MONGO_URI=mongodb+srv://<usuario>:<clave>@<cluster>.mongodb.net
DB_NAME=inkhaus

# Autenticación
JWT_SECRET=<cadena-larga-y-aleatoria>

# Correo (Gmail con contraseña de aplicación)
EMAIL_USER=<tu-correo>@gmail.com
EMAIL_PASS=<contraseña-de-aplicación>
EMAIL_FROM_NAME=Ink Haus

# Webpay Plus (Transbank)
# Por defecto usa el ambiente de integración. Para producción:
TBK_ENVIRONMENT=integration        # integration | production
# TBK_COMMERCE_CODE=<código-de-comercio>   (solo producción)
# TBK_API_KEY=<api-key>                    (solo producción)

# Abono de las citas (valores en CLP; todos opcionales)
ABONO_PORCENTAJE=20        # % de la cotización mínima
ABONO_MINIMA_CLP=10000     # abono mínimo
ABONO_MAXIMA_CLP=100000    # abono máximo
ABONO_AJUSTE_CLP=10000     # abono fijo para citas de tipo "ajuste"
ABONO_SESION_CLP=30000     # abono fijo para sesiones sin cotización
```

> `BACKEND_URL` debe ser accesible desde el navegador del cliente: Webpay redirige a `${BACKEND_URL}/api/payments/return` al terminar el pago.

### Levantar el backend

```bash
cd backend
npm install
npm run dev        # con nodemon → http://localhost:8080
# npm start        # sin recarga automática
```

### Levantar el frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

En desarrollo, Vite redirige `/api` y `/uploads` al backend (`http://localhost:8080`), por lo que el frontend no necesita variables de entorno.

### Build de producción del frontend

```bash
cd frontend
npm run build      # genera frontend/dist
npm run preview    # sirve el build localmente
```

---

## Roles disponibles

| Rol      | Acceso |
|----------|--------|
| cliente  | Agendar y cancelar citas, pagar el abono, ver su portafolio de citas, usar el chatbot y el chat en vivo, editar su perfil |
| artista  | Ver y gestionar su agenda, subir y editar piezas del portafolio, editar su perfil público, atender sus conversaciones |
| admin    | Gestión completa: usuarios, artistas, precios, estilos, reportes, mensajes de contacto, consultas del chatbot, contenido del sitio |

---

## Abono de las citas

El abono se calcula **siempre en el servidor** (`services/abono.js`); el cliente nunca envía el monto.

- Cita de tipo **ajuste**: monto fijo (`ABONO_AJUSTE_CLP`).
- **Sesión con cotización**: `ABONO_PORCENTAJE` % de la cotización mínima, redondeado a miles y acotado entre `ABONO_MINIMA_CLP` y `ABONO_MAXIMA_CLP`.
- **Sesión sin cotización**: monto fijo (`ABONO_SESION_CLP`).

Al aprobarse el pago, la cita pasa de `pendiente` a `confirmada`.

---

## Endpoints principales (API)

Todas las rutas cuelgan de `/api`. Las respuestas siguen el formato `{ success, info | message }`.

### Autenticación y usuarios

| Método | Ruta                          | Auth     | Descripción |
|--------|-------------------------------|----------|-------------|
| POST   | /register                     | Pública  | Crear cuenta |
| POST   | /login                        | Pública  | Iniciar sesión |
| GET    | /verify                       | JWT      | Verificar token y obtener usuario |
| PUT    | /me                           | JWT      | Actualizar mi perfil |
| POST   | /forgot-password              | Pública  | Solicitar enlace de recuperación |
| POST   | /reset-password/:token        | Pública  | Restablecer contraseña con token |
| PUT    | /change-password              | JWT      | Cambiar contraseña (requiere la actual) |
| GET    | /users                        | admin    | Listar usuarios |
| GET / PUT / DELETE | /user/:id         | admin    | Ver, editar o eliminar un usuario |

### Artistas, portafolio y estilos

| Método | Ruta                          | Auth              | Descripción |
|--------|-------------------------------|-------------------|-------------|
| GET    | /artists                      | Pública           | Listar artistas activos |
| GET    | /artists/:id                  | Pública           | Detalle de un artista |
| GET    | /artists/me                   | JWT               | Mi perfil de artista |
| GET    | /artists/all                  | admin             | Listar todos (incluye desactivados) |
| POST   | /artists/full                 | admin             | Crear artista junto con su usuario |
| PUT    | /artists/:id                  | artista (propio) / admin | Editar perfil |
| PUT    | /artists/:id/full             | admin             | Editar artista y datos de su usuario |
| DELETE | /artists/:id                  | admin             | Desactivar (borrado lógico) |
| PUT    | /artists/:id/reactivate       | admin             | Reactivar |
| DELETE | /artists/:id/permanent        | admin             | Eliminar definitivamente |
| GET    | /portfolio                    | Pública           | Portafolio filtrable (`?artist=`, `?style=`) |
| POST   | /portfolio                    | artista / admin   | Crear pieza |
| PUT / DELETE | /portfolio/:id          | artista dueño / admin | Editar o eliminar pieza |
| GET    | /styles                       | Pública           | Listar estilos |
| POST   | /styles                       | admin             | Crear estilo |
| POST   | /upload                       | artista / admin   | Subir imagen (JPG, PNG, WEBP; máx. 8 MB) |
| POST   | /upload/video                 | admin             | Subir video (MP4, WEBM, MOV; máx. 60 MB) |

### Precios y cotización

| Método | Ruta                          | Auth     | Descripción |
|--------|-------------------------------|----------|-------------|
| GET    | /pricing/quote                | Pública  | Motor de cotización (`zona_corporal`, `tamanio`, `style`, `artist`) |
| GET    | /pricing/artist/:artistId     | Pública  | Tabla de precios de un artista |
| PUT    | /pricing/artist/:artistId     | JWT      | Reemplazar tabla de precios del artista |
| GET / POST | /pricing                  | admin    | Listar o crear tarifas |
| PUT / DELETE | /pricing/:id            | admin    | Editar o eliminar tarifa |

### Citas y pagos

| Método | Ruta                                    | Auth                         | Descripción |
|--------|-----------------------------------------|------------------------------|-------------|
| GET    | /appointments/availability/:artistId    | Pública                      | Horarios libres (`?date=YYYY-MM-DD`) |
| POST   | /appointments                           | JWT (cliente)                | Crear cita (con cotización opcional) |
| GET    | /appointments/me                        | JWT                          | Mis citas |
| GET    | /appointments                           | admin / artista              | Todas las citas, o las de mi agenda |
| PUT    | /appointments/:id                       | cliente (solo cancelar) / artista dueño / admin | Cancelar, confirmar o reagendar |
| POST   | /payments/create                        | JWT (dueño de la cita)       | Iniciar transacción Webpay |
| ALL    | /payments/return                        | Pública (retorno de Webpay)  | Confirmar el pago y redirigir al frontend |
| GET    | /payments/order/:buyOrder               | JWT                          | Detalle de un pago |

### Mensajería, contacto y contenido

| Método | Ruta                              | Auth             | Descripción |
|--------|-----------------------------------|------------------|-------------|
| POST   | /conversations                    | JWT              | Crear o reutilizar una conversación |
| GET    | /conversations/me                 | JWT              | Mis conversaciones según rol |
| GET / POST | /conversations/:id/messages   | JWT (participante) | Leer o enviar mensajes |
| PUT    | /conversations/:id/close          | artista / admin  | Cerrar conversación |
| POST   | /contact                          | Pública          | Enviar formulario de contacto |
| GET / PUT | /contact, /contact/:id         | admin            | Ver y marcar mensajes como atendidos |
| POST   | /chatbot-queries                  | Pública          | Registrar consulta sin respuesta del chatbot |
| GET / PUT | /chatbot-queries, /chatbot-queries/:id | admin  | Revisar y atender consultas |
| GET    | /site-content/:key                | Pública          | Leer contenido editable (p. ej. video de cuidados) |
| PUT    | /site-content/:key                | admin            | Actualizar contenido editable |

---

## Rutas del frontend

| Ruta                          | Acceso            | Página |
|-------------------------------|-------------------|--------|
| `/`                           | Pública           | Inicio |
| `/portfolio`, `/artists`, `/artists/:id` | Pública | Portafolio y artistas |
| `/proceso`, `/cuidados`, `/contact` | Pública     | Información y contacto |
| `/login`, `/register`, `/forgot-password`, `/reset-password/:token` | Pública | Autenticación |
| `/artists/:artistId/agendar`  | Sesión iniciada   | Agendar cita |
| `/mi-cuenta`                  | Sesión iniciada   | Mi cuenta y mis citas |
| `/pago/resultado`             | Sesión iniciada   | Resultado del pago Webpay |
| `/artista/portafolio`         | artista           | Subir piezas |
| `/artista/perfil`, `/artista/citas` | artista / admin | Perfil y agenda |
| `/admin`, `/admin/reportes`, `/admin/precios` | admin | Panel de administración |

---

## Jira — Épicas

| Épica | Alcance | Estado |
|-------|---------|--------|
| TS-1 Base del sistema | Repositorio, BD, home, autenticación y roles | ✅ Implementado |
| TS-2 Chatbot + Planimetría | Chatbot, cotización y visor 3D de zonas del cuerpo | ✅ Implementado |
| TS-3 Citas y notificaciones | Agenda, disponibilidad, correos y recordatorios | ✅ Implementado |
| TS-4 Pagos Webpay Plus | Abono de citas con Transbank | ✅ Implementado |
| TS-5 Panel admin y QA | Panel de administración, reportes y pruebas | 🔄 En progreso |
