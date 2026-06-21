# 🚀 Guía de Desarrollo Local - ClaudApp

Esta guía te explica cómo configurar y ejecutar ClaudApp en tu máquina local para desarrollo.

## 📋 Requisitos Previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- **Docker** y **Docker Compose** (para MongoDB local)

### Instalar Docker

**Windows/Mac:**
- Descarga [Docker Desktop](https://www.docker.com/products/docker-desktop/)

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Fedora
sudo dnf install docker docker-compose
```

## 🗄️ Paso 1: Iniciar MongoDB Local

ClaudApp usa MongoDB como base de datos. Tenés dos opciones:

### Opción A: MongoDB Local con Docker (RECOMENDADO)

**Windows:**
```bash
# Doble click en el script o desde terminal:
scripts\start-db.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/start-db.sh
./scripts/start-db.sh
```

**O manualmente:**
```bash
docker-compose up -d
```

Esto inicia MongoDB en:
- **URI:** `mongodb://claudapp:claudapp123@localhost:27017/claudapp?authSource=admin`
- **Puerto:** 27017
- **Usuario:** claudapp
- **Password:** claudapp123

### Opción B: MongoDB Atlas (Nube)

Si preferís usar MongoDB Atlas:

1. Creá una cuenta en [MongoDB Atlas](https://cloud.mongodb.com/)
2. Creá un cluster gratuito (M0)
3. Configurá un usuario de base de datos
4. Obtené el connection string
5. Actualizá tu archivo `.env`

## ⚙️ Paso 2: Configurar Variables de Entorno

Copiá el archivo de ejemplo:

```bash
cp .env.example .env
```

Editá `.env` según tu configuración:

```bash
# MongoDB (ya configurado para Docker local)
MONGODB_URI=mongodb://claudapp:claudapp123@localhost:27017/claudapp?authSource=admin

# Puerto del servidor
PORT=3000

# Secreto de sesión (CAMBIAR en producción)
SESSION_SECRET=tu-secreto-aqui

# Google OAuth (opcional, Fase 5)
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret
```

## 📦 Paso 3: Instalar Dependencias

```bash
# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

## 🎯 Paso 4: Ejecutar la Aplicación

### Modo Desarrollo

**Backend (API):**
```bash
npm run dev
```

El servidor inicia en `http://localhost:3000`

**Frontend (React):**
```bash
cd frontend
npm start
```

La interfaz web abre en `http://localhost:3001`

### Modo Producción (Build)

```bash
# Compilar frontend
cd frontend
npm run build
cd ..

# Iniciar servidor en modo producción
NODE_ENV=production npm start
```

Esto sirve tanto la API como el frontend en `http://localhost:3000`

## 🧪 Paso 5: Ejecutar Tests

```bash
# Tests del backend
npm test

# Tests del frontend
cd frontend
npm test
```

## 📊 Estructura de la Base de Datos

MongoDB crea automáticamente estas colecciones:

- **users** - Usuarios del sistema
- **records** - Registros de horas trabajadas
- **sessions** - Sesiones activas (express-session)
- **accesslogs** - Logs de acceso al sistema
- **modificationlogs** - Logs de modificaciones (admin)
- **messages** - Mensajes entre usuarios

## 🔧 Comandos Útiles de Docker

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Detener MongoDB
docker-compose down

# Reiniciar MongoDB
docker-compose restart

# Eliminar datos (¡CUIDADO!)
docker-compose down -v
```

## 🐛 Troubleshooting

### MongoDB no inicia

**Error:** "Port 27017 already in use"
```bash
# Ver qué usa el puerto
# Windows:
netstat -ano | findstr :27017

# Linux/Mac:
lsof -i :27017

# Solución: Detener el proceso o cambiar puerto en docker-compose.yml
```

### No puedo conectar a MongoDB

**Verificar que MongoDB está corriendo:**
```bash
docker-compose ps
```

**Ver logs:**
```bash
docker-compose logs mongodb
```

**Reiniciar:**
```bash
docker-compose restart
```

### Error de autenticación

**Verificar credenciales en .env:**
```bash
MONGODB_URI=mongodb://claudapp:claudapp123@localhost:27017/claudapp?authSource=admin
```

**Recrear contenedor:**
```bash
docker-compose down
docker-compose up -d
```

## 📝 Siguientes Pasos

Una vez que tengas todo corriendo:

1. **Accedé a la app:** http://localhost:3001
2. **Login por defecto:**
   - Usuario: `admin`
   - Password: `admin123`
3. **Explorá las funcionalidades:**
   - Registrar horas
   - Ver reportes
   - Administrar usuarios (solo admin)

## 🆘 Ayuda

Si tenés problemas:

1. Revisá los logs de Docker: `docker-compose logs -f`
2. Revisá los logs del servidor: terminal donde corre `npm run dev`
3. Verificá que MongoDB esté corriendo: `docker-compose ps`
4. Consultá la [documentación de Docker](https://docs.docker.com/)

---

**¿Todo funciona?** ¡Genial! Ahora podés empezar a desarrollar. 🎉
