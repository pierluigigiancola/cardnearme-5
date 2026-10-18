import { useNavigate } from '@tanstack/react-router'
import { Keyboard, LogIn, LogOut, Moon, Sun, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { publicCommands, signedInCommands } from './navigation'

import { useSignOut, useViewer } from '#/auth/useViewer'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '#/components/ui/command'
import { useTheme } from '#/lib/theme'

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/**
 * Cmd/Ctrl+K palette plus global keyboard navigation:
 * "G then key" jumps to a page, F1 opens the shortcut list.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const viewer = useViewer()
  const signOut = useSignOut()
  const { theme, toggleTheme } = useTheme()
  const signedIn = viewer.kind === 'user'

  useEffect(() => {
    let awaitingSecondKey = false
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
        return
      }
      if (event.key === 'F1') {
        event.preventDefault()
        void navigate({
          params: { topic: 'shortcuts' },
          to: '/help/$topic',
        })
        return
      }
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()
      if (!awaitingSecondKey) {
        if (key === 'g') {
          awaitingSecondKey = true
          resetTimer = setTimeout(() => (awaitingSecondKey = false), 1200)
        }
        return
      }
      awaitingSecondKey = false
      clearTimeout(resetTimer)

      const commands = signedIn ? [...publicCommands, ...signedInCommands] : publicCommands
      const command = commands.find(item => item.shortcut === key)
      if (command) {
        void navigate({ to: command.to })
      }
      else if (!signedIn && key === 'l') {
        void navigate({ to: '/sign-in' })
      }
      else if (!signedIn && key === 'r') {
        void navigate({ to: '/sign-up' })
      }
      else if (signedIn && key === 'o') {
        void signOut()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(resetTimer)
    }
  }, [navigate, signOut, signedIn])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog
      onOpenChange={setOpen}
      open={open}
    >
      <CommandInput placeholder="Type a command or page…" />

      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {publicCommands.map(command => (
            <CommandItem
              key={command.to}
              onSelect={() => run(() => void navigate({ to: command.to }))}
            >
              <command.icon />

              {command.label}

              {command.shortcut && (
                <CommandShortcut>
                  G
                  {' '}

                  {command.shortcut.toUpperCase()}
                </CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {signedIn && (
          <CommandGroup heading="Your space">
            {signedInCommands.map(command => (
              <CommandItem
                key={command.to}
                onSelect={() => run(() => void navigate({ to: command.to }))}
              >
                <command.icon />

                {command.label}

                {command.shortcut && (
                  <CommandShortcut>
                    G
                    {' '}

                    {command.shortcut.toUpperCase()}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Account & settings">
          <CommandItem onSelect={() => run(toggleTheme)}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            Switch to

            {' '}

            {theme === 'dark' ? 'light' : 'dark'}

            {' '}
            theme
          </CommandItem>

          <CommandItem
            onSelect={() => run(() => void navigate({
              params: { topic: 'shortcuts' },
              to: '/help/$topic',
            }))}>
            <Keyboard />
            Keyboard shortcuts

            <CommandShortcut>F1</CommandShortcut>
          </CommandItem>

          {signedIn
            ? (
              <CommandItem onSelect={() => run(() => void signOut())}>
                <LogOut />
                Sign out

                <CommandShortcut>G O</CommandShortcut>
              </CommandItem>
            )
            : (
              <>
                <CommandItem onSelect={() => run(() => void navigate({ to: '/sign-in' }))}>
                  <LogIn />
                  Sign in

                  <CommandShortcut>G L</CommandShortcut>
                </CommandItem>

                <CommandItem onSelect={() => run(() => void navigate({ to: '/sign-up' }))}>
                  <UserPlus />
                  Sign up

                  <CommandShortcut>G R</CommandShortcut>
                </CommandItem>
              </>
            )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
