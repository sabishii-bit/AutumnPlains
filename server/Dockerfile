FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Compile TypeScript
RUN npm run build

# Expose WebSocket/HTTP port
EXPOSE 4733

# Run the compiled server
CMD ["npm", "start"]
