# Use existing coffee-chaincode image (no internet needed)
FROM coffee-chaincode:1.85
WORKDIR /app
# Replace the binary with the new v1.89
COPY coffee /app/chaincode
RUN chmod +x /app/chaincode
CMD ["/app/chaincode"]
