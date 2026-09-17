// Enhanced Document Examination Dialog for Banks Portal
// Shows all documents attached to an LC with detailed review capabilities

<Dialog 
  open={documentExaminationOpen} 
  onClose={() => setDocumentExaminationOpen(false)}
  maxWidth="lg"
  fullWidth
>
  <DialogTitle sx={{ bgcolor: '#9b30b7', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
    <Description sx={{ fontSize: 28 }} />
    Document Examination - LC {selectedLC?.lcId}
  </DialogTitle>
  <DialogContent sx={{ mt: 2 }}>
    {selectedLC && (
      <>
        {/* LC Summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">LC Amount:</Typography>
              <Typography variant="body1" fontWeight="bold">
                ${selectedLC.amount?.toLocaleString()} {selectedLC.currency}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">Exporter:</Typography>
              <Typography variant="body1">{selectedLC.exporterId}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">Buyer:</Typography>
              <Typography variant="body1">{selectedLC.buyerName || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Alert>

        {/* Document Checklist */}
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assignment />
          Required Documents for LC Settlement
        </Typography>

        {selectedLC.documents && selectedLC.documents.length > 0 ? (
          <Box>
            {selectedLC.documents.map((doc: any, index: number) => (
              <Card key={index} sx={{ mb: 2, border: '1px solid', borderColor: doc.status === 'verified' ? 'success.main' : doc.status === 'rejected' ? 'error.main' : 'grey.300' }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* Document Icon & Info */}
                    <Grid item xs={1}>
                      <Box sx={{ 
                        width: 50, 
                        height: 50, 
                        borderRadius: 1, 
                        bgcolor: doc.status === 'verified' ? '#4caf50' : doc.status === 'rejected' ? '#f44336' : '#ff9800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Description sx={{ fontSize: 30 }} />
                      </Box>
                    </Grid>

                    {/* Document Details */}
                    <Grid item xs={5}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {doc.documentType?.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        File: {doc.fileName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        By: {doc.uploadedBy || 'Exporter'}
                      </Typography>
                    </Grid>

                    {/* Verification Status */}
                    <Grid item xs={2}>
                      <Chip 
                        label={doc.status === 'verified' ? 'VERIFIED' : doc.status === 'rejected' ? 'REJECTED' : 'PENDING'}
                        color={doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'error' : 'warning'}
                        icon={doc.status === 'verified' ? <CheckCircle /> : doc.status === 'rejected' ? <Cancel /> : <AccessTime />}
                      />
                    </Grid>

                    {/* Actions */}
                    <Grid item xs={4}>
                      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => {
                            // Open document in new tab
                            window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/documents/${doc.documentId}/download`, '_blank');
                          }}
                          fullWidth
                        >
                          View Document
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => handleVerifyDocument(doc.documentId, true)}
                            disabled={doc.status === 'verified'}
                            sx={{ flex: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => handleVerifyDocument(doc.documentId, false)}
                            disabled={doc.status === 'rejected'}
                            sx={{ flex: 1 }}
                          >
                            Reject
                          </Button>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Document Notes/Comments */}
                    {doc.verifierComments && (
                      <Grid item xs={12}>
                        <Alert severity={doc.status === 'verified' ? 'success' : 'error'} sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            <strong>Comments:</strong> {doc.verifierComments}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}

            {/* Overall Examination Summary */}
            <Card sx={{ mt: 3, bgcolor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Examination Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Total Documents:</Typography>
                    <Typography variant="h4" color="primary">{selectedLC.documents.length}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Verified:</Typography>
                    <Typography variant="h4" color="success.main">
                      {selectedLC.documents.filter((d: any) => d.status === 'verified').length}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Pending:</Typography>
                    <Typography variant="h4" color="warning.main">
                      {selectedLC.documents.filter((d: any) => !d.status || d.status === 'pending').length}
                    </Typography>
                  </Grid>
                </Grid>
                
                {selectedLC.documents.every((d: any) => d.status === 'verified') && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      ✅ All documents have been verified and comply with LC terms. This LC is ready for payment release.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Alert severity="warning">
            No documents have been uploaded for this LC yet.
          </Alert>
        )}
      </>
    )}
  </DialogContent>
  <DialogActions sx={{ px: 3, py: 2 }}>
    <Button onClick={() => setDocumentExaminationOpen(false)}>
      Close
    </Button>
    {selectedLC?.documents?.every((d: any) => d.status === 'verified') && (
      <Button 
        variant="contained" 
        color="success"
        startIcon={<CheckCircle />}
        onClick={() => {
          handleExamineLCDocuments(selectedLC.lcId, true, '');
          setDocumentExaminationOpen(false);
        }}
      >
        Mark as Compliant & Ready for Payment
      </Button>
    )}
  </DialogActions>
</Dialog>

// Handler for verifying individual documents
const handleVerifyDocument = async (documentId: string, approved: boolean) => {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const response = await apiFetch(`/documents/${documentId}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approved,
        verifierComments: approved ? 'Document verified and complies with LC terms' : 'Document does not comply',
        verificationDate: new Date().toISOString(),
      }),
    });

    const result = await response.json();
    if (result.success) {
      showSuccess(
        approved ? 'Document Approved' : 'Document Rejected',
        approved ? 'Document verified successfully' : 'Document marked as non-compliant'
      );
      loadBankingData(); // Refresh to show updated status
    } else {
      showError('Verification Failed', result.error?.message || 'Unknown error');
    }
  } catch (error: any) {
    showError('Network Error', error.message);
  }
};
