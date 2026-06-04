# Multi-stage build for Linux chaincode
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY go.mod go.sum main.go ./
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o chaincode main.go

# Final stage
FROM alpine:3.18
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /build/chaincode /app/chaincode
COPY connection.json /app/connection.json
RUN chmod +x /app/chaincode
EXPOSE 9999
CMD ["/app/chaincode"]
