FROM ghcr.io/puppeteer/puppeteer:22.6.0

WORKDIR /usr/src/app

USER root

RUN apt-get update && apt-get install -y \
    xauth \
    libx11-6 \
    libxrender1 \
    libxext6 \
    libxi6 \
    libxtst6 \
    libxrandr2 \
    alsa-utils \
    x11-apps \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --verbose --legacy-peer-deps
COPY ./src ./src

RUN npm install --verbose --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["node", "src/app.js"]