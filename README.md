# Checkip

```bash
docker build -t checkip .
```

```bash
docker run --rm --init --name checkip -p 5000:5000 checkip
docker run --rm --init --name checkip -e 'HOST=0.0.0.0' -e 'PORT=5000' -p 127.0.0.1:5000:5000 checkip
```
