FROM golang:1.24 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bot main.go

FROM debian:stable-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/bot /app/bot
COPY --from=builder /app/*.png /app/

CMD ["/app/bot"]