import { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const FIGMA_CAPTURE_DEV_ONLY = process.env.NODE_ENV !== "production";

export default function Root({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          name="viewport"
        />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (!${FIGMA_CAPTURE_DEV_ONLY ? "true" : "false"}) return;
                const hostname = window.location.hostname.toLowerCase();
                const isTrustedHost =
                  hostname === "localhost" ||
                  hostname === "127.0.0.1" ||
                  hostname === "0.0.0.0" ||
                  hostname.endsWith(".local") ||
                  /^10\\./.test(hostname) ||
                  /^192\\.168\\./.test(hostname) ||
                  /^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(hostname);
                if (!isTrustedHost) return;
                if (!window.location.hash.includes("figmacapture=")) return;
                const script = document.createElement("script");
                script.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
                script.async = true;
                document.head.appendChild(script);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
