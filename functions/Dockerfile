FROM node:18

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
  libglib2.0-0 \
  libnss3 \
  libx11-6 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libxkbcommon0 \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libx11-xcb1 \
  libxshmfence1 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libatk-bridge2.0-0 \
  libxcomposite1 \
  libxrandr2 \
  libgtk-3-0 \
  fonts-liberation \
  libappindicator3-1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget

# Set workdir and install deps
WORKDIR /app
COPY . .
RUN npm install
RUN npx playwright install --with-deps

CMD ["npm", "start"]
