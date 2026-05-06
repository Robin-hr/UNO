FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the server code
COPY . .

# The port your server listens on
EXPOSE 3002

CMD ["node", "index.js"]
