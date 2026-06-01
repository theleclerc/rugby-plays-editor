FROM node:20-alpine

RUN apk add --no-cache git bash github-cli ttf-dejavu fontconfig

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install
