import { Link } from '@tanstack/react-router'
import { LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react'
import { useState } from 'react'

import { GlobalSearch } from './GlobalSearch'
import { primaryNav, publicCommands, signedInCommands } from './navigation'

import { useReturnPath } from '#/auth/AuthGate'
import { useSignOut, useViewer } from '#/auth/useViewer'
import { Logo } from '#/components/brand/Logo'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { useTheme } from '#/lib/theme'

export function AppHeader() {
  const viewer = useViewer()
  const redirect = useReturnPath()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b bg-header backdrop-blur">
      <div className="page-wrap flex h-14 items-center gap-3">
        <MobileNav />

        <Link
          aria-label="CardNearMe home"
          className="shrink-0"
          to="/"
        >
          <Logo />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {primaryNav.map(item => (
            <Link
              activeProps={{ className: 'bg-primary/15 text-primary' }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              key={item.to}
              to={item.to}
            >
              <item.icon className="size-4" />

              {item.label}
            </Link>
          ))}
        </nav>

        <GlobalSearch className="ml-auto hidden w-full max-w-xs md:block" />

        <Button
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="ml-auto md:ml-0"
          onClick={toggleTheme}
          size="icon"
          variant="ghost"
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>

        {viewer.kind === 'user'
          ? <UserMenu username={viewer.username} />
          : (
            <div className="flex items-center gap-1">
              <Button
                asChild
                className="hidden sm:inline-flex"
                size="sm"
                variant="ghost"
              >
                <Link
                  search={{ redirect }}
                  to="/sign-in"
                >
                  Sign in
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
              >
                <Link
                  search={{ redirect }}
                  to="/sign-up"
                >
                  Sign up
                </Link>
              </Button>
            </div>
          )}
      </div>
    </header>
  )
}

function UserMenu({ username }: { username: string }) {
  const signOut = useSignOut()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Account menu"
          className="rounded-full"
          size="icon"
          variant="ghost"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary uppercase">{username.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56"
      >
        <DropdownMenuLabel>{username}</DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            params={{ username }}
            to="/users/$username"
          >
            <User />
            Public profile
          </Link>
        </DropdownMenuItem>

        {signedInCommands.map(item => (
          <DropdownMenuItem
            asChild
            key={item.to}
          >
            <Link to={item.to}>
              <item.icon />

              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuItem asChild>
          <Link to="/x/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileNav() {
  const [open, setOpen] = useState(false)
  const viewer = useViewer()
  const items = viewer.kind === 'user' ? [...primaryNav, ...signedInCommands] : [...primaryNav, ...publicCommands.slice(3)]

  return (
    <Sheet
      onOpenChange={setOpen}
      open={open}
    >
      <SheetTrigger asChild>
        <Button
          aria-label="Open menu"
          className="lg:hidden"
          size="icon"
          variant="ghost"
        >
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent
        className="w-72"
        side="left"
      >
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>

        <GlobalSearch className="px-4" />

        <nav className="flex flex-col gap-1 px-2">
          {items.map(item => (
            <Link
              activeProps={{ className: 'bg-primary/15 text-primary' }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold"
              key={item.to}
              onClick={() => setOpen(false)}
              to={item.to}
            >
              <item.icon className="size-4" />

              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
