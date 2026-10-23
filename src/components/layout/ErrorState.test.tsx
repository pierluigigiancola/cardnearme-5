import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('announces the failure with its title and the error message', () => {
    const html = renderToStaticMarkup(
      <ErrorState
        error={new Error('Network unreachable')}
        title="Could not load your matches"
      />,
    )

    expect(html).toContain('role="alert"')
    expect(html).toContain('Could not load your matches')
    expect(html).toContain('Network unreachable')
  })

  it('falls back to a generic title and message', () => {
    const html = renderToStaticMarkup(<ErrorState error={null} />)

    expect(html).toContain('Something went wrong')
    expect(html).toContain('Please try again.')
  })

  it('offers a retry button only when it can retry', () => {
    expect(renderToStaticMarkup(<ErrorState error={null} />)).not.toContain('Try again')
    expect(renderToStaticMarkup(
      <ErrorState
        error={null}
        onRetry={() => {}}
      />,
    )).toContain('Try again')
  })
})
