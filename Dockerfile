FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Don't run as root
USER node

EXPOSE 7860

# Start app
CMD [ "npm", "start" ]