import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// These run without VITE_SUPABASE_* set, i.e. with browser-only workspaces.
describe('app flow (no backend)', () => {
  it('“Build your own” starts from zero: empty state, validation, first transaction', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/dashboard')
    render(<App />)

    // Signed out → welcome page with both options and the author credit
    expect(await screen.findByRole('heading', { name: 'Build your own FinTrack' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { name: 'See the prototype' })).toBeInTheDocument()
    expect(screen.getByText(/Designed & built by/)).toHaveTextContent('Ojas Mali')

    await user.type(screen.getByLabelText(/What should we call you/), 'Ojas')
    await user.click(screen.getByRole('button', { name: 'Start tracking' }))

    // Empty state, no sample data offered
    // The dashboard route is lazy-loaded; allow for a cold module transform on the first run.
    expect(await screen.findByText('No transactions yet.', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Ojas\./)
    expect(screen.queryByRole('button', { name: 'Explore with sample data' })).not.toBeInTheDocument()

    // Submit the form empty → validation
    await user.click(screen.getByRole('button', { name: 'Add income' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Add income' }))
    expect(within(dialog).getByText('Enter an amount.')).toBeInTheDocument()
    expect(within(dialog).getByText('Who paid you?')).toBeInTheDocument()

    // Fill in correctly
    await user.type(within(dialog).getByLabelText('Amount'), '42000')
    await user.type(within(dialog).getByLabelText('From'), 'Northwind Labs')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Salary')
    await user.click(within(dialog).getByRole('button', { name: 'Add income' }))

    // Persisted to *this* workspace, toast shown, dashboard updated without reload
    expect(await screen.findByText('Income added')).toBeInTheDocument()
    expect(await screen.findByText('Total balance', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getAllByText('₹42,000').length).toBeGreaterThan(0)
    const own = JSON.parse(localStorage.getItem('fintrack.own.v1')!)
    expect(own.transactions).toHaveLength(1)
    expect(own.transactions[0]).toMatchObject({ amount: 42000, type: 'income', merchant: 'Northwind Labs' })
    expect(sessionStorage.getItem('fintrack.demo.v1')).toBeNull()
  })

  it('“Continue as guest” opens a labelled, unsaved workspace full of sample data', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    render(<App />)
    await user.click((await screen.findAllByRole('button', { name: /Continue as guest/ }))[0])
    expect(await screen.findByText('Total balance', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/Guest mode/)
    expect(localStorage.getItem('fintrack.demo.v1')).toBeNull()
    const sample = JSON.parse(sessionStorage.getItem('fintrack.demo.v1')!)
    expect(sample.transactions.length).toBeGreaterThan(100)
    expect(sample.transactions.every((t: { is_sample: boolean }) => t.is_sample)).toBe(true)
  })
})
