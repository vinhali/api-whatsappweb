FROM ghcr.io/puppeteer/puppeteer:22.6.0

WORKDIR /usr/src/app

USER root

COPY package*.json ./
RUN npm install --verbose --legacy-peer-deps
COPY ./src ./src

RUN npm install --verbose --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["node", "src/app.js"]