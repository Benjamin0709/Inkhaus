# Ink Haus — Plataforma Web Integral para Estudio de Tatuajes

**Proyecto de Título — INSW410 — Universidad Andrés Bello**  
Autor: Benjamín Alexander Rojas Ponce

---

## Estructura del proyecto

```
inkhaus/
├── backend/              ← API REST (Node.js + Express + MongoDB)
│   ├── config/           ← Conexión a base de datos
│   ├── controllers/      ← Lógica de negocio
│   ├── middleware/        ← auth.js (JWT + roles)
│   ├── models/           ← Schemas Mongoose
│   ├── routes/           ← Endpoints REST
│   ├── services/         ← Email (Nodemailer)
│   └── server.js         ← Entry point
│
└── frontend/             ← React 18 + Tailwind CSS (Vite)
    └── src/
        ├── api/          ← Llamadas axios a la API
        ├── components/   ← layout, auth, ui
        ├── context/      ← AuthContext (JWT global)
        ├── hooks/        ← Custom hooks
        └── pages/        ← Home, Auth, Admin
```

---

## Requisitos previos

- Node.js >= 18
- MongoDB Atlas (o local)
- Cuenta Gmail con App Password para emails

---

## Levantar el backend

```bash
cd backend
cp .env          # Rellenar variables
npm install
npm run dev                    # http://localhost:8080
```

## Levantar el frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

---

## Roles disponibles

| Rol      | Acceso                                       |
|----------|----------------------------------------------|
| cliente  | Agendar citas, ver portafolio, usar chatbot  |
| artista  | Ver su agenda, subir piezas al portafolio    |
| admin    | Gestión completa: artistas, precios, reportes |

---

## Endpoints principales (API)

| Método | Ruta               | Auth     | Descripción              |
|--------|--------------------|----------|--------------------------|
| POST   | /api/register      | Pública  | Crear cuenta             |
| POST   | /api/login         | Pública  | Iniciar sesión           |
| GET    | /api/verify        | JWT      | Verificar token          |
| GET    | /api/artists       | Pública  | Listar artistas          |
| GET    | /api/portfolio     | Pública  | Portafolio filtrable     |
| GET    | /api/pricing/quote | Pública  | Motor de cotización      |
| POST   | /api/appointments  | cliente  | Crear cita               |

---

## Jira — Épicas

| Épica | Estado     |
|-------|------------|
| TS-1 Base del sistema (repo, BD, home, auth) | ✅ En progreso |
| TS-2 Chatbot + Planimetría SVG               |  Próximo     |
| TS-3 Citas y notificaciones                  |              |
| TS-4 Pagos Webpay Plus                       |              |
| TS-5 Panel admin y QA                        |              |
