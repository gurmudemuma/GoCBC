#!/usr/bin/env node
const http = require('http');

const SHIPMENT_ID = 'SHIP1787204371672';

// Login
const loginData = JSON.stringify({
  username: 'shippingAdmin',
  password: 'password123'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    const token = response.data?.token || response.token;
    
    // Get shipment
    http.get({
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/shipments/${SHIPMENT_ID}`,
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        const shipment = JSON.parse(data2);
        if (shipment.success) {
          console.log('\n📦 Shipment Data:\n');
          console.log('Shipment ID:', shipment.data.shipmentId);
          console.log('Status:', shipment.data.status);
          console.log('Buyer ID:', shipment.data.buyerId);
          console.log('Exporter ID:', shipment.data.exporterId);
          console.log('Contract ID:', shipment.data.contractId);
          console.log('\n🚚 Land Transport:');
          console.log('Truck Plate:', shipment.data.truckPlateNumber);
          console.log('Driver:', shipment.data.driverName);
          console.log('Company:', shipment.data.landTransportCompany);
          console.log('\n🚢 Container & Vessel:');
          console.log('Container Number:', shipment.data.containerNumber);
          console.log('Container Type:', shipment.data.containerType);
          console.log('Vessel Name:', shipment.data.vesselName);
          console.log('Voyage Number:', shipment.data.voyageNumber);
          console.log('Bill of Lading:', shipment.data.billOfLadingNo);
          console.log('\n📍 Ports:');
          console.log('Departure Port:', shipment.data.departurePort);
          console.log('Destination Port:', shipment.data.destinationPort);
          console.log('Arrival Date:', shipment.data.actualArrival);
          console.log('\n');
        } else {
          console.error('Error:', shipment.error);
        }
      });
    });
  });
});

loginReq.write(loginData);
loginReq.end();
