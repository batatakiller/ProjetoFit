FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Para modo desenvolvimento com hot-reload no docker
CMD ["npm", "run", "dev"]
