#!/bin/bash

echo "🚀 Iniciando ClaudApp - Base de datos MongoDB..."
echo ""

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    echo "📥 Instalá Docker desde: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar si docker-compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose no está instalado"
    echo "📥 Instalá docker-compose desde: https://docs.docker.com/compose/install/"
    exit 1
fi

# Iniciar MongoDB
echo "📦 Iniciando MongoDB en Docker..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MongoDB iniciado correctamente"
    echo ""
    echo "📊 Información de conexión:"
    echo "   URI: mongodb://claudapp:claudapp123@localhost:27017/claudapp?authSource=admin"
    echo "   Host: localhost"
    echo "   Port: 27017"
    echo "   Database: claudapp"
    echo "   User: claudapp"
    echo "   Password: claudapp123"
    echo ""
    echo "🛑 Para detener MongoDB: docker-compose down"
    echo "📋 Para ver logs: docker-compose logs -f"
    echo ""
else
    echo ""
    echo "❌ Error al iniciar MongoDB"
    echo "📋 Ver logs con: docker-compose logs"
    exit 1
fi
