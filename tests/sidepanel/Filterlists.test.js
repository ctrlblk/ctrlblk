import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';

vi.mock('/src/js/filters.js', () => {
    const mock = {
        getFilterlistDetails: vi.fn().mockResolvedValue([
            ['default', { name: 'Default Filters', enabled: true }],
            ['ctrlblk', { name: 'CtrlBlock Filters', enabled: true }],
            ['annoyance1', { name: 'Cookie Notices', enabled: false, group: 'annoyances' }],
        ]),
        enableFilterlist: vi.fn(),
        disableFilterlist: vi.fn(),
    };
    return { default: mock, ...mock };
});

import Filterlists from '../../src/sidepanel/Filterlists.svelte';

describe('Filterlists', () => {
    it('renders Filter lists heading', () => {
        render(Filterlists);
        expect(screen.getByText('Filter lists')).toBeInTheDocument();
    });

    it('renders ruleset groups after loading', async () => {
        render(Filterlists);
        await waitFor(() => {
            expect(screen.getAllByText(/Default/).length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Annoyances')).toBeInTheDocument();
        });
    });

    it('renders checkboxes for filter lists', async () => {
        render(Filterlists);
        await waitFor(() => {
            expect(screen.getByText('Default')).toBeInTheDocument();
        });

        // Open the "Default" accordion to reveal checkboxes
        const defaultHeader = screen.getByText('Default');
        await fireEvent.click(defaultHeader.closest('button') || defaultHeader);
        await waitFor(() => {
            expect(screen.getByText('Default Filters')).toBeInTheDocument();
            expect(screen.getByText('CtrlBlock Filters')).toBeInTheDocument();
        });

        // Open the "Annoyances" accordion to reveal its checkboxes
        const annoyancesHeader = screen.getByText('Annoyances');
        await fireEvent.click(annoyancesHeader.closest('button') || annoyancesHeader);
        await waitFor(() => {
            expect(screen.getByText('Cookie Notices')).toBeInTheDocument();
        });
    });

    it('updates accordion header when a filter is toggled', async () => {
        render(Filterlists);

        // Wait for groups to load
        await waitFor(() => {
            expect(screen.getByText('Annoyances')).toBeInTheDocument();
        });

        // Open the Annoyances accordion
        const annoyancesHeader = screen.getByText('Annoyances');
        await fireEvent.click(annoyancesHeader.closest('button') || annoyancesHeader);

        await waitFor(() => {
            expect(screen.getByText('Cookie Notices')).toBeInTheDocument();
        });

        // "Cookie Notices" should appear only once (in the checkbox label)
        expect(screen.getAllByText('Cookie Notices')).toHaveLength(1);

        // Click the Cookie Notices checkbox
        const checkbox = screen.getByText('Cookie Notices').closest('label')?.querySelector('input')
            || screen.getByRole('checkbox', { name: /Cookie Notices/i });
        await fireEvent.click(checkbox);

        // After toggling, "Cookie Notices" should also appear in the accordion header
        const annoyancesButton = screen.getByText('Annoyances').closest('button');
        await waitFor(() => {
            expect(annoyancesButton.textContent).toContain('Cookie Notices');
        });

        // Verify enableFilterlist was called
        const filters = (await import('/src/js/filters.js')).default;
        expect(filters.enableFilterlist).toHaveBeenCalledWith('annoyance1');
    });
});
