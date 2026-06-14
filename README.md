# CLAUDIA Express

Aplicación de registro de horas de trabajo construida con Node.js, Express, MongoDB y React.

## Estructura del Proyecto

```
├── server.js              # Backend Express
├── src/models/            # Modelos MongoDB
├── frontend/              # Frontend React (Vite + TypeScript)
│   ├── src/pages/         # Login, Dashboard
│   ├── src/components/    # Componentes compartidos
│   ├── src/services/      # API service
│   └── e2e/               # Tests E2E (Playwright)
└── .env                   # Configuración
```

## Requisitos

- Node.js (v18 o superior)
- Cuenta en MongoDB Atlas

## Instalación

1. Clonar el repositorio
2. Instalar dependencias del backend:
```bash
npm install
```
3. Instalar dependencias del frontend:
```bash
cd frontend && npm install
```

4. Crear archivo `.env` con tu conexión a MongoDB:
```
MONGODB_URI=tu_conexion_mongodb_atlas
PORT=3000
SESSION_SECRET=tu_secreto
```

5. Iniciar backend:
```bash
npm start
```

6. Iniciar frontend (desarrollo):
```bash
cd frontend && npm start
```

## Despliegue

- **Backend**: Render, Railway, Heroku
- **Frontend**: Vercel, Netlify (o servido por el backend en producción)

## Tecnologías

- **Backend**: Node.js + Express + MongoDB
- **Frontend**: React 18 + TypeScript + Vite
- **Testing**: Vitest + Playwright
- **Auth**: Express Sessions + MongoDB Store
