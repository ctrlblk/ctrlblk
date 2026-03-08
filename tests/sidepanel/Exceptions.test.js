import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('/src/js/background/reportAd.js', () => ({
    getAdReportsByDomains: vi.fn().mockResolvedValue(new Map()),
}));

import Exceptions from '../../src/sidepanel/Exceptions.svelte';

describe('Exceptions', () => {
    let exceptions;

    beforeEach(() => {
        vi.clearAllMocks();
        exceptions = writable(['example.com', 'test.org']);
    });

    it('renders Exceptions heading', () => {
        render(Exceptions, { exceptions });
        expect(screen.getByText('Exceptions')).toBeInTheDocument();
    });

    it('renders exception list items', async () => {
        render(Exceptions, { exceptions });
        await waitFor(() => {
            expect(screen.getByText('example.com')).toBeInTheDocument();
            expect(screen.getByText('test.org')).toBeInTheDocument();
        });
    });

    it('shows "No exceptions" when list is empty', async () => {
        exceptions = writable([]);
        render(Exceptions, { exceptions });
        await waitFor(() => {
            expect(screen.getByText('No exceptions')).toBeInTheDocument();
        });
    });

    it('removes exception when remove button is clicked', async () => {
        render(Exceptions, { exceptions });
        await waitFor(() => {
            expect(screen.getByText('example.com')).toBeInTheDocument();
        });

        const row = screen.getByText('example.com').closest('tr');
        const removeBtn = within(row).getByRole('button');
        await fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(screen.queryByText('example.com')).not.toBeInTheDocument();
            expect(screen.getByText('test.org')).toBeInTheDocument();
        });
    });

    it('filters exceptions by search term', async () => {
        render(Exceptions, { exceptions });
        await waitFor(() => {
            expect(screen.getByText('example.com')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search by domain');
        searchInput.value = 'test';
        await fireEvent.input(searchInput);

        await waitFor(() => {
            expect(screen.queryByText('example.com')).not.toBeInTheDocument();
            expect(screen.getByText('test.org')).toBeInTheDocument();
        });
    });
});
