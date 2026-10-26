# Multi-stage build
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the chaincode binary with static linking
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -ldflags="-w -s" -o coffee .

# Final stage - minimal runtime image
FROM alpine:3.18

# Install required runtime libraries
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy the chaincode binary from builder
COPY --from=builder /build/coffee /app/chaincode

# Make it executable
RUN chmod +x /app/chaincode

# Expose chaincode server port
EXPOSE 9999

# Run the chaincode
CMD ["/app/chaincode"]
