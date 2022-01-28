# Checkip

## Build with Docker

```bash
docker build -t checkip .
```

## Run with Docker

```bash
docker run \
    --rm \
    --init \
    --name checkip \
    -e 'HOST=0.0.0.0' \
    -e 'PORT=5000' \
    -e 'V4URL=https://checkip4.example.com' \
    -e 'V6URL=https://checkip6.example.com' \
    -e 'V4N6URL=https://checkip.example.com' \
    -p 127.0.0.1:5000:5000 \
    checkip
```

## Run with Docker Compose

'.env'

```conf
HOST=0.0.0.0
PORT=5001
V4URL=https://checkip4.example.com
V6URL=https://checkip6.example.com
V4N6URL=https://checkip.example.com
```

`docker-compose.yml`

```yaml
version: '3.7'
services:
  awstats:
    image: pabra/checkip:main
    container_name: checkip
    environment:
      HOST: ${HOST:?HOST not set}
      PORT: ${PORT:?PORT not set}
      V4URL: ${V4URL:?V4URL not set}
      V6URL: ${V6URL:?V6URL not set}
      V4N6URL: ${V4N6URL:?V4N6URL not set}
    ports:
      - 127.0.0.1:${PORT}:${PORT}
    restart: unless-stopped
    init: true
```
