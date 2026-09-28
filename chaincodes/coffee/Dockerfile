# Use the old working base image
FROM coffee-chaincode:1.85
WORKDIR /app
# Copy the new chaincode binary
COPY coffee /app/chaincode
RUN chmod +x /app/chaincode
CMD ["/app/chaincode"]
