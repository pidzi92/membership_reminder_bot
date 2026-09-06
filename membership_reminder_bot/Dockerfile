ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js + tzdata (for correct timezone handling)
RUN apk add --no-cache nodejs npm tzdata

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund

# Copy application code
COPY bot.js .
COPY lib ./lib

# Copy and prepare the S6/entrypoint script
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
