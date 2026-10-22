import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { AuthPromptProvider } from '../auth/AuthGate'
import { viewerQuery } from '../auth/viewer'
import { AppFooter } from '../components/layout/AppFooter'
import { AppHeader } from '../components/layout/AppHeader'
import { CommandPalette } from '../components/layout/CommandPalette'
import { TradeBuilderProvider } from '../components/trading/TradeBuilder'
import { Button } from '../components/ui/button'
import { Toaster } from '../components/ui/sonner'
import { TooltipProvider } from '../components/ui/tooltip'
import PostHogProvider from '../integrations/posthog/provider'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { PricingProvider } from '../lib/pricing'
import { ThemeProvider, themeInitScript } from '../lib/theme'
import appCss from '../styles.css?url'


import { getLocale } from '#/paraglide/runtime'

interface MyRouterContext { queryClient: QueryClient }

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    // Other redirect strategies are possible; see
    // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale())
    }
    const viewer = await context.queryClient.ensureQueryData(viewerQuery())
    return { viewer }
  },
  head: () => ({
    links: [
      {
        href: appCss,
        rel: 'stylesheet',
      },
      {
        href: '/favicon.svg',
        rel: 'icon',
        type: 'image/svg+xml',
      },
    ],
    meta: [
      { charSet: 'utf-8' },
      {
        content: 'width=device-width, initial-scale=1',
        name: 'viewport',
      },
      { title: 'CardNearMe — Trade TCG cards locally' },
      {
        content: 'Find the cards you want from traders at game stores near you.',
        name: 'description',
      },
    ],
  }),
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <div className="page-wrap flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>

      <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unexpected error'}</p>

      <Button onClick={reset}>Try again</Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="page-wrap flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>

      <h1 className="text-2xl font-bold">Page not found</h1>

      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  ),
  shellComponent: RootDocument,
})

function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthPromptProvider>
          <PricingProvider>
            <TradeBuilderProvider>
              <div className="flex min-h-screen flex-col">
                <AppHeader />

                <main className="flex-1">
                  <Outlet />
                </main>

                <AppFooter />
              </div>

              <CommandPalette />

              <Toaster />
            </TradeBuilderProvider>
          </PricingProvider>
        </AuthPromptProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html
      className="dark"
      lang={getLocale()}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        <HeadContent />
      </head>

      <body>
        <PostHogProvider>
          {children}

          {import.meta.env.DEV && (
            <TanStackDevtools
              config={{ position: 'bottom-right' }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          )}
        </PostHogProvider>

        <Scripts />
      </body>
    </html>
  )
}
