FROM node:22-slim

# Instalamos pnpm globalmente
RUN npm install -g pnpm

WORKDIR /app

# Copiamos los archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalamos dependencias ignorando build scripts problemáticos
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiamos el código fuente
COPY . .

# Compilamos TypeScript a JavaScript
RUN pnpm run build

# Comando de inicio
CMD ["node", "dist/index.js"]
