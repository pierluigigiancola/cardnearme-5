import { Bell, BookOpen, Calculator, Home, Inbox, Layers, LifeBuoy, ListChecks, MapPin, ScanLine, Store, Swords } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { FileRoutesByTo } from '#/routeTree.gen'

type RoutePath = keyof FileRoutesByTo

export interface NavItem {
  label: string
  to: RoutePath
  icon: LucideIcon
  /** Second key of the "G then key" shortcut. */
  shortcut?: string
}

export const primaryNav: NavItem[] = [
  {
    icon: MapPin,
    label: 'Find cards',
    to: '/find-cards',
  },
  {
    icon: Layers,
    label: 'Cards',
    shortcut: 'f',
    to: '/sets',
  },
  {
    icon: Swords,
    label: 'Decks',
    shortcut: 'p',
    to: '/decks',
  },
  {
    icon: ScanLine,
    label: 'Scanner',
    to: '/scanner',
  },
]

export const publicCommands: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    shortcut: 'h',
    to: '/',
  },
  {
    icon: Layers,
    label: 'Card sets',
    shortcut: 'f',
    to: '/sets',
  },
  {
    icon: Swords,
    label: 'Public decks',
    shortcut: 'p',
    to: '/decks',
  },
  {
    icon: Store,
    label: 'Stores',
    shortcut: 's',
    to: '/stores',
  },
  {
    icon: Calculator,
    label: 'Swap calculator',
    shortcut: 'w',
    to: '/swap-calculator',
  },
  {
    icon: LifeBuoy,
    label: 'Help',
    shortcut: 'e',
    to: '/help',
  },
]

export const signedInCommands: NavItem[] = [
  {
    icon: BookOpen,
    label: 'Binder',
    shortcut: 'c',
    to: '/x/binder',
  },
  {
    icon: Swords,
    label: 'My decks',
    shortcut: 'd',
    to: '/x/decks',
  },
  {
    icon: ListChecks,
    label: 'Lists',
    shortcut: 't',
    to: '/x/lists',
  },
  {
    icon: Inbox,
    label: 'Inbox',
    shortcut: 'i',
    to: '/x/inbox',
  },
  {
    icon: Bell,
    label: 'Notifications',
    shortcut: 'n',
    to: '/x/notifications',
  },
]

export const footerNav: {
  title: string;
  links: {
    label: string;
    to: RoutePath
  }[]
}[] = [
  {
    links: [
      {
        label: 'About',
        to: '/about',
      },
      {
        label: 'Changelog',
        to: '/changelog',
      },
      {
        label: 'Contact',
        to: '/contact',
      },
    ],
    title: 'CardNearMe',
  },
  {
    links: [
      {
        label: 'Help centre',
        to: '/help',
      },
      {
        label: 'Community decks',
        to: '/decks',
      },
      {
        label: 'Stores',
        to: '/stores',
      },
    ],
    title: 'Resources',
  },
  {
    links: [
      {
        label: 'Swap calculator',
        to: '/swap-calculator',
      },
      {
        label: 'Scanner',
        to: '/scanner',
      },
      {
        label: 'Card sets',
        to: '/sets',
      },
    ],
    title: 'Tools',
  },
  {
    links: [{
      label: 'Privacy',
      to: '/privacy',
    }],
    title: 'Legal',
  },
]
