import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web root HTML — ask mobile browsers to resize the layout when the keyboard opens
 * instead of drawing over the message box.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: #F3F6F1;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              body { margin: 0; }
              @media (prefers-reduced-motion: no-preference) {
                html { scroll-behavior: smooth; }
              }
              button, a, [role="button"] {
                -webkit-tap-highlight-color: transparent;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
