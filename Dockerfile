FROM node:latest

# Set working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose both ports (user server and admin server)
EXPOSE 2026 4000

# Run the application
CMD ["node", "enigma.js"]