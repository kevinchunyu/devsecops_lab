FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Optional: seed database during build
RUN node init-db.js

EXPOSE 3009
CMD ["node", "app.js"]
