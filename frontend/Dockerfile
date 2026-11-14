# Etapa de compilación
FROM node:20-alpine AS build

WORKDIR /app

# Copiar configuración de paquetes e instalar dependencias
COPY frontend/package.json ./
RUN npm install

# Copiar fixtures de contrato y código fuente
COPY contract /contract
COPY frontend ./

# Compilar aplicación para producción
RUN npm run build

# Etapa de producción con Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

