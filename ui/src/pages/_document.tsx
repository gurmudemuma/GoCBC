import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.svg" />
        <meta name="description" content="Ethiopian Coffee Export Consortium Blockchain System - Unified platform for managing Ethiopian coffee exports with blockchain-powered traceability" />
        <meta name="theme-color" content="#2e7d32" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
