# ⏱️ ClaudApp

Aplicación de registro de horas de trabajo, fácil y rápida. Construida con Node.js, Express, MongoDB y React.

**Diseñada para móviles** con interfaz amigable y botones 3D.

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** v18 o superior
- **Docker** y **Docker Compose** (para MongoDB local)

### Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/claudapp.git
cd claudapp
```

2. **Iniciar MongoDB local:**

**Windows:**
```bash
scripts\start-db.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/start-db.sh
./scripts/start-db.sh
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

El archivo `.env` ya está configurado para MongoDB local. Si usás MongoDB Atlas, editá la variable `MONGODB_URI`.

4. **Instalar dependencias:**
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

5. **Iniciar la aplicación:**

**Backend (API):**
```bash
npm run dev
```

**Frontend (React):**
```bash
cd frontend
npm start
```

6. **Acceder a la app:**
- Frontend: http://localhost:3001
- API: http://localhost:3000

**Login por defecto:**
- Usuario: `admin`
- Password: `admin123`

## 📚 Documentación

- **[Guía de Desarrollo Local](docs/DESARROLLO.md)** - Configuración completa, troubleshooting, comandos Docker
- **[Guía de Producción](docs/PRODUCCION.md)** - Deploy en VPS con Nginx, SSL, PM2 (próximamente)

## 🏗️ Estructura del Proyecto

```
claudapp/
├── server.js              # Backend Express
├── src/models/            # Modelos MongoDB
├── frontend/              # Frontend React (Vite + TypeScript)
│   ├── src/pages/         # Login, Dashboard
│   ├── src/components/    # Componentes compartidos
│   ├── src/services/      # API service
│   └── e2e/               # Tests E2E (Playwright)
├── scripts/               # Scripts de utilidad
│   ├── start-db.sh        # Iniciar MongoDB (Linux/Mac)
│   └── start-db.bat       # Iniciar MongoDB (Windows)
├── docker-compose.yml     # Configuración MongoDB local
├── .env.example           # Variables de entorno (ejemplo)
└── docs/                  # Documentación
```

## 🗄️ Base de Datos

### MongoDB Local (Docker) - RECOMENDADO

ClaudApp incluye configuración para MongoDB local con Docker:

- **URI:** `mongodb://claudapp:claudapp123@localhost:27017/claudapp?authSource=admin`
- **Puerto:** 27017
- **Usuario:** claudapp
- **Password:** claudapp123

**Ventajas:**
- ✅ No dependés de internet
- ✅ Más rápido para desarrollo
- ✅ Control total de los datos
- ✅ Perfecto para open source

### MongoDB Atlas (Nube)

Si preferís usar MongoDB Atlas:

1. Creá una cuenta en [MongoDB Atlas](https://cloud.mongodb.com/)
2. Creá un cluster gratuito (M0)
3. Configurá un usuario de base de datos
4. Obtené el connection string
5. Actualizá `.env` con tu URI

## 🛠️ Tecnologías

- **Backend:** Node.js + Express + MongoDB
- **Frontend:** React 18 + TypeScript + Vite
- **Base de datos:** MongoDB (local con Docker o Atlas)
- **Testing:** Vitest + Playwright
- **Auth:** Express Sessions + MongoDB Store
- **Seguridad:** Helmet + Rate Limiting + Validación de inputs

## 🧪 Tests

```bash
# Tests del backend
npm test

# Tests del frontend
cd frontend
npm test
```

## 📦 Scripts Disponibles

### Backend

```bash
npm start          # Iniciar servidor (producción)
npm run dev        # Iniciar servidor (desarrollo con nodemon)
npm test           # Ejecutar tests
```

### Frontend

```bash
cd frontend
npm start          # Iniciar servidor de desarrollo
npm run build      # Compilar para producción
npm test           # Ejecutar tests
```

### Docker

```bash
docker-compose up -d       # Iniciar MongoDB
docker-compose down        # Detener MongoDB
docker-compose logs -f     # Ver logs
docker-compose restart     # Reiniciar MongoDB
```

## 🚀 Despliegue en Producción

### Opciones de Hosting

- **VPS propio** (recomendado para open source)
- **Render** / **Railway** / **Heroku** (backend)
- **Vercel** / **Netlify** (frontend)

### Stack de Producción

- **Servidor:** Ubuntu 22.04 LTS
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt (Certbot)
- **Base de datos:** MongoDB local en el VPS

**Guía completa de deploy:** [docs/PRODUCCION.md](docs/PRODUCCION.md) (próximamente)

## 🔒 Seguridad

ClaudApp implementa varias capas de seguridad:

- **Helmet.js** - Headers HTTP seguros
- **Rate Limiting** - Protección contra brute force
- **Validación de inputs** - express-validator en todas las rutas
- **Sesiones seguras** - express-session con MongoDB store
- **Contraseñas hasheadas** - bcrypt

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Creá una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrí un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

## 👥 Contacto

- **Autor:** Miguel
- **Email:** contacto@clau-app.duckdns.org
- **Web:** https://clau-app.duckdns.org

---

**Hecho con ❤️ para simplificar el registro de horas de trabajo**
