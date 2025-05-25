# Use Node.js LTS
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy app code
COPY . .

# Install dependencies
RUN npm install

# Create placeholder download file
RUN mkdir -p public/downloads && echo "This is a test file." > public/downloads/test.txt

# Expose port
EXPOSE 3009

# Run the app
CMD ["node", "app.js"]
