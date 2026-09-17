/**
 * Test Blockchain Data Button
 * 
 * Add this to any portal to test direct blockchain access
 * 
 * Usage in NBEPortal.tsx or BanksPortal.tsx:
 * import { TestBlockchainButton } from '@/components/TestBlockchainButton';
 * 
 * Then add: <TestBlockchainButton />
 */

import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Alert } from '@mui/material';
import { Science } from '@mui/icons-material';

interface ForexData {
  forexId: string;
  status: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exporterId: string;
  lcId: string;
}

export const TestBlockchainButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: ForexData[]; error?: string } | null>(null);

  const testDirectBlockchainAccess = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🧪 Testing direct CouchDB blockchain access...');
      
      const auth = btoa('admin:adminpw');
      const response = await fetch(
        'http://localhost:5984/coffeechannel_coffee/_all_docs?startkey="FOREX_"&endkey="FOREX_\\ufff0"&include_docs=true',
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CouchDB error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const forexData: ForexData[] = data.rows.map((row: any) => ({
        forexId: row.doc.forexId,
        status: row.doc.status,
        requestedAmount: row.doc.requestedAmount,
        allocatedAmount: row.doc.allocatedAmount,
        currency: row.doc.currency,
        exporterId: row.doc.exporterId,
        lcId: row.doc.lcId || 'N/A'
      }));

      console.log(`✅ Found ${forexData.length} forex records from blockchain:`, forexData);
      
      setResult({
        success: true,
        data: forexData
      });
      
    } catch (error: any) {
      console.error('❌ Blockchain test failed:', error);
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        startIcon={<Science />}
        onClick={() => {
          setOpen(true);
          testDirectBlockchainAccess();
        }}
        sx={{ ml: 2 }}
      >
        Test Blockchain
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          🔗 Direct Blockchain Access Test
        </DialogTitle>
        <DialogContent>
          {testing && (
            <Alert severity="info">
              Testing direct CouchDB connection to Hyperledger Fabric state database...
            </Alert>
          )}

          {result && result.success && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ Successfully connected to blockchain!
                <br />
                Found {result.data?.length || 0} forex records
              </Alert>

              {result.data && result.data.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Forex Records from Blockchain:
                  </Typography>
                  {result.data.map((forex, index) => (
                    <Box
                      key={forex.forexId}
                      sx={{
                        p: 2,
                        mb: 1,
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <Typography variant="body2">
                        <strong>{index + 1}. {forex.forexId}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: {forex.status} | 
                        Exporter: {forex.exporterId} | 
                        Requested: ${forex.requestedAmount?.toLocaleString()} {forex.currency}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Allocated: ${forex.allocatedAmount?.toLocaleString()} | 
                        LC: {forex.lcId}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {result.data && result.data.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No forex records found in blockchain. Create a forex allocation first.
                </Alert>
              )}
            </Box>
          )}

          {result && !result.success && (
            <Alert severity="error">
              ❌ Connection failed: {result.error}
              <br /><br />
              Possible causes:
              <ul>
                <li>CouchDB not running on port 5984</li>
                <li>CORS not enabled</li>
                <li>Wrong credentials</li>
              </ul>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={testDirectBlockchainAccess} disabled={testing} variant="contained">
            Test Again
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
