import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

export const Route = createFileRoute('/contact')({
  head: () => ({ meta: [{ title: 'Contact us | CardNearMe' }] }),
  component: ContactPage,
})

function ContactPage() {
  const [sent, setSent] = useState(false)
  return (
    <div className="page-wrap max-w-2xl">
      <PageHeader
        description="Questions or feedback? Fill out the form and we will get back to you as soon as possible."
        title="Contact us"
      />

      {sent
        ? <p className="rounded-xl border bg-card p-6">Thanks! Your message has been sent.</p>
        : (
          <form
            className="space-y-4 rounded-xl border bg-card p-6"
            onSubmit={(event) => {
              event.preventDefault()
              // Wire to a contact service (email, helpdesk) when available.
              toast.success('Message sent')
              setSent(true)
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name</Label>

              <Input
                id="contact-name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>

              <Input
                id="contact-email"
                required
                type="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>

              <Textarea
                id="contact-message"
                required
                rows={5}
              />
            </div>

            <Button type="submit">Send message</Button>
          </form>
        )}
    </div>
  )
}
