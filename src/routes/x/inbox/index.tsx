import { Link, createFileRoute } from '@tanstack/react-router'
import { MessagesSquare } from 'lucide-react'

import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/x/inbox/')({ component: InboxIndex })

function InboxIndex() {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-3 p-8 text-center">
      <MessagesSquare className="size-10 text-muted-foreground" />

      <p className="font-semibold">Pick a conversation</p>

      <p className="text-sm text-muted-foreground">Proposed trades, meetups and messages with other traders show up here.</p>

      <Button
        asChild
        variant="outline"
      >
        <Link to="/find-cards">Find traders near you</Link>
      </Button>
    </div>
  )
}
