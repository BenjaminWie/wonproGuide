# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy frontend source and build
COPY App.tsx index.html index.tsx vite.config.ts tsconfig.json ./
COPY components ./components
COPY services ./services
COPY constants.ts types.ts ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-slim AS backend-builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy backend source and build
COPY backend ./backend
COPY tsconfig.json .
COPY tsconfig.backend.json .
RUN npx tsc --project tsconfig.backend.json

# Stage 3: Production Image
FROM node:20-slim
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy built frontend and backend
COPY --from=frontend-builder /app/dist ./dist/frontend
COPY --from=backend-builder /app/dist ./dist/backend

# Expose ports
EXPOSE 3000 3001

# Start script to run both servers
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
