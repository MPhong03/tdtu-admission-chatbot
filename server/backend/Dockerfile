# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /src

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the project files
COPY . .

# Expose the port (Render will bind automatically)
EXPOSE 5000

# Define environment variables for safety (optional, Render overrides from dashboard anyway)
ENV NODE_ENV=production

# Start the application
CMD [ "npm", "start" ]
