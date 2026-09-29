/**
 * PDFViewer Component
 * Renders PDF documents using PDF.js library
 * Works in all browsers without relying on native PDF plugins
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, IconButton, Stack } from '@mui/material';
import { ZoomIn, ZoomOut, NavigateBefore, NavigateNext } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import axios from 'axios';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface PDFViewerProps {
  documentId: string;
  token: string;
  width?: number;
  height?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ documentId, token, width, height = 500 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPDFFromAPI();
    
    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId, token]);

  useEffect(() => {
    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl]);

  useEffect(() => {
    if (pdf) {
      renderPage(pageNum);
    }
  }, [pdf, pageNum, scale]);

  const loadPDFFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch PDF using axios with auth token (same as download)
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      // Create blob URL from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      console.error('Error fetching PDF from API:', err);
      setError('Failed to load PDF document from server');
      setLoading(false);
    }
  };

  const loadPDF = async () => {
    if (!pdfUrl) return;

    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      setPdf(pdfDoc);
      setNumPages(pdfDoc.numPages);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setError('Failed to render PDF document');
      setLoading(false);
    }
  };

  const renderPage = async (num: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(num);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  };

  const changePage = (offset: number) => {
    const newPageNum = pageNum + offset;
    if (newPageNum >= 1 && newPageNum <= numPages) {
      setPageNum(newPageNum);
    }
  };

  const changeZoom = (delta: number) => {
    const newScale = scale + delta;
    if (newScale >= 0.5 && newScale <= 3) {
      setScale(newScale);
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height={height}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading PDF...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height={height}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* PDF Controls */}
      <Box
        sx={{
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            size="small"
            onClick={() => changePage(-1)}
            disabled={pageNum <= 1}
            sx={{ color: 'white' }}
          >
            <NavigateBefore />
          </IconButton>
          <Typography variant="caption">
            Page {pageNum} of {numPages}
          </Typography>
          <IconButton
            size="small"
            onClick={() => changePage(1)}
            disabled={pageNum >= numPages}
            sx={{ color: 'white' }}
          >
            <NavigateNext />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            onClick={() => changeZoom(-0.2)}
            disabled={scale <= 0.5}
            sx={{ color: 'white' }}
          >
            <ZoomOut />
          </IconButton>
          <Typography variant="caption">{Math.round(scale * 100)}%</Typography>
          <IconButton
            size="small"
            onClick={() => changeZoom(0.2)}
            disabled={scale >= 3}
            sx={{ color: 'white' }}
          >
            <ZoomIn />
          </IconButton>
        </Stack>
      </Box>

      {/* PDF Canvas */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          bgcolor: '#525659',
          p: 2,
        }}
      >
        <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
      </Box>
    </Box>
  );
};

export default PDFViewer;
