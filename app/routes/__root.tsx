/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import appCss from "~/styles/globals.css?url";
import { useThemeEffect } from "~/hooks/useThemeEffect";
import { PwaUpdatePrompt } from "~/components/pwa/PwaUpdatePrompt";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GigSync - App para Músicos" },
      { name: "description", content: "Metrónomo, afinador, setlists offline-first" },
      { name: "theme-color", content: "#1337ec" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { 
        rel: "preconnect", 
        href: "https://fonts.googleapis.com" 
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  useThemeEffect();
  return (
    <>
      <Outlet />
      <PwaUpdatePrompt />
    </>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
