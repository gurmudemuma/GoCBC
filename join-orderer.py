#!/usr/bin/env python3
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.ssl_ import create_urllib3_context

# Disable SSL warnings
requests.packages.urllib3.disable_warnings()

# Certificate paths
cert_file = 'blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt'
key_file = 'blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key'
genesis_block = 'blockchain/channel-artifacts/coffeechannel_genesis.block'

# Read the genesis block
with open(genesis_block, 'rb') as f:
    block_data = f.read()

# Prepare multipart/form-data
files = {'config-block': ('genesis.block', block_data, 'application/octet-stream')}

# Make the request
url = 'https://localhost:7053/participation/v1/channels'
response = requests.post(
    url,
    files=files,
    cert=(cert_file, key_file),
    verify=False
)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
