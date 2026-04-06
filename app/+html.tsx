import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import appJson from '../app.json';

/**
 * Root HTML for web static export. Browsers cache favicons aggressively; app version
 * is appended as a query param so tab icons refresh after icon or deploy updates.
 */
function faviconVersion(): string {
  const version = (appJson as { expo?: { version?: string } }).expo?.version ?? '0';
  return encodeURIComponent(version);
}

export default function Root({ children }: PropsWithChildren) {
  const v = faviconVersion();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#1a2744" />
        <link rel="icon" href={`/favicon.ico?v=${v}`} />
        <link rel="shortcut icon" href={`/favicon.ico?v=${v}`} />
        <link rel="apple-touch-icon" href={`/favicon.ico?v=${v}`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
