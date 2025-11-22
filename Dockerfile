FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["npm", "start"]
