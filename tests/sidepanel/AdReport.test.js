import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import AdReport from '../../src/sidepanel/AdReport.svelte';

const mockAdReport = {
    data: {
        page: {
            url: 'https://example.com/page',
            datetime: new Date().toISOString(),
        },
        screenshot: 'data:image/png;base64,abc123',
    },
    github: {
        url: 'https://github.com/org/repo/issues/42',
        number: 42,
    },
};

describe('AdReport', () => {
    it('renders page slug from URL', () => {
        render(AdReport, { adReport: mockAdReport });
        expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('renders screenshot image', () => {
        const { container } = render(AdReport, { adReport: mockAdReport });
        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img.getAttribute('src')).toBe('data:image/png;base64,abc123');
    });

    it('renders github issue link', () => {
        render(AdReport, { adReport: mockAdReport });
        const link = screen.getByRole('link', { name: /#42/ });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://github.com/org/repo/issues/42');
    });

    it('renders expandable data section', () => {
        render(AdReport, { adReport: mockAdReport });
        expect(screen.getByText('Show all data')).toBeInTheDocument();
    });

    it('shows data table when expandable is opened', async () => {
        render(AdReport, { adReport: mockAdReport });
        const toggle = screen.getByText('Show all data');
        await fireEvent.click(toggle.closest('a') || toggle);
        await waitFor(() => {
            expect(screen.getByText('page.url')).toBeInTheDocument();
        });
    });
});
