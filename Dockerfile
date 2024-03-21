FROM alpine:3.19.1

RUN apk add --no-cache nodejs npm python3 make g++ chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --verbose --legacy-peer-deps
COPY ./src ./src

RUN npm install --verbose --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["node", "src/app.js"]
