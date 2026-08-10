      {/* Professional Static KPI Cards - Always visible at top */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: `2px solid ${tabValue === 0 ? '#ff9800' : 'transparent'}`,
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)' 
              }
            }}
            onClick={() => setTabValue(0)}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                bgcolor: '#ff980015', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 1.5,
                mx: 'auto'
              }}>
                <Warning sx={{ fontSize: 28, color: '#ff9800' }} />
              </Box>
              <Typography variant="caption" sx={{ 
                color: '#666', 
                textTransform: 'uppercase', 
                fontWeight: 600, 
                fontSize: '0.7rem', 
                letterSpacing: 0.5, 
                mb: 0.5, 
                display: 'block' 
              }}>
                Pending Applications
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', lineHeight: 1 }}>
                {allApplications.filter(a => a.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: `2px solid ${tabValue === 1 ? BRAND_COLOR : 'transparent'}`,
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)' 
              }
            }}
            onClick={() => setTabValue(1)}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                bgcolor: `${BRAND_COLOR}15`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 1.5,
                mx: 'auto'
              }}>
                <Coffee sx={{ fontSize: 28, color: BRAND_COLOR }} />
              </Box>
              <Typography variant="caption" sx={{ 
                color: '#666', 
                textTransform: 'uppercase', 
                fontWeight: 600, 
                fontSize: '0.7rem', 
                letterSpacing: 0.5, 
                mb: 0.5, 
                display: 'block' 
              }}>
                Approved Exporters
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: BRAND_COLOR, lineHeight: 1 }}>
                {approvedApplications.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: `2px solid ${tabValue === 2 ? '#2196f3' : 'transparent'}`,
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)' 
              }
            }}
            onClick={() => setTabValue(2)}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                bgcolor: '#2196f315', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 1.5,
                mx: 'auto'
              }}>
                <Description sx={{ fontSize: 28, color: '#2196f3' }} />
              </Box>
              <Typography variant="caption" sx={{ 
                color: '#666', 
                textTransform: 'uppercase', 
                fontWeight: 600, 
                fontSize: '0.7rem', 
                letterSpacing: 0.5, 
                mb: 0.5, 
                display: 'block' 
              }}>
                Pending Contracts
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3', lineHeight: 1 }}>
                {allContracts.filter(c => c.contractStatus === 'REGISTERED').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: `2px solid ${tabValue === 3 ? '#4caf50' : 'transparent'}`,
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)' 
              }
            }}
            onClick={() => setTabValue(3)}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                bgcolor: '#4caf5015', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 1.5,
                mx: 'auto'
              }}>
                <Science sx={{ fontSize: 28, color: '#4caf50' }} />
              </Box>
              <Typography variant="caption" sx={{ 
                color: '#666', 
                textTransform: 'uppercase', 
                fontWeight: 600, 
                fontSize: '0.7rem', 
                letterSpacing: 0.5, 
                mb: 0.5, 
                display: 'block' 
              }}>
                Quality Inspections
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50', lineHeight: 1 }}>
                {allInspectionRecords.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
