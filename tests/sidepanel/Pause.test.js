import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

const mockBrowser = vi.hoisted(() => ({
    tabs: {
        query: vi.fn().mockResolvedValue([{
            id: 1, url: 'https://example.com/page', selected: true, windowId: 1,
        }]),
        get: vi.fn().mockResolvedValue({
            id: 1, url: 'https://example.com/page', selected: true, windowId: 1,
        }),
        captureVisibleTab: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
        reload: vi.fn().mockResolvedValue(undefined),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        onCreated: { addListener: vi.fn() },
    },
    windows: {
        getCurrent: vi.fn().mockResolvedValue({ id: 1 }),
    },
}));

vi.mock('/src/js/lib/browser-api.js', () => ({
    browser: mockBrowser,
}));

vi.mock('/src/js/background/reportAd.js', () => ({
    getAdReportsByDomains: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('/src/js/reportAd.js', () => ({
    createAdReportData: vi.fn().mockResolvedValue({
        page: { url: 'https://example.com/page', datetime: '2024-01-01T00:00:00Z' },
        screenshot: 'data:image/png;base64,abc',
    }),
    uploadAdReport: vi.fn().mockResolvedValue('mock-uuid'),
}));

import Pause from '../../src/sidepanel/Pause.svelte';

describe('Pause', () => {
    let exceptions;

    beforeEach(() => {
        vi.clearAllMocks();
        exceptions = writable([]);
        mockBrowser.tabs.query.mockResolvedValue([{
            id: 1, url: 'https://example.com/page', selected: true, windowId: 1,
        }]);
        mockBrowser.tabs.get.mockResolvedValue({
            id: 1, url: 'https://example.com/page', selected: true, windowId: 1,
        });
        mockBrowser.windows.getCurrent.mockResolvedValue({ id: 1 });
    });

    it('renders pause heading with current tab hostname', async () => {
        render(Pause, { exceptions });
        await waitFor(() => {
            expect(screen.getByText(/Pause blocking on/)).toBeInTheDocument();
            expect(screen.getByText('example.com')).toBeInTheDocument();
        });
    });

    it('shows play button when site is exempt', async () => {
        exceptions = writable(['example.com']);
        render(Pause, { exceptions });
        await waitFor(() => {
            expect(screen.getByText(/Restart blocking on/)).toBeInTheDocument();
        });
    });

    it('transitions to Ask state when Pause is clicked', async () => {
        render(Pause, { exceptions });
        await waitFor(() => {
            expect(screen.getByText(/Pause blocking on/)).toBeInTheDocument();
        });

        const buttons = screen.getAllByRole('button');
        await fireEvent.click(buttons[0]);

        await waitFor(() => {
            expect(screen.getByText('Did it help?')).toBeInTheDocument();
        });
    });

    it('transitions back to PlayPause when Play is clicked', async () => {
        exceptions = writable(['example.com']);
        render(Pause, { exceptions });
        await waitFor(() => {
            expect(screen.getByText(/Restart blocking on/)).toBeInTheDocument();
        });

        const buttons = screen.getAllByRole('button');
        await fireEvent.click(buttons[0]);

        await waitFor(() => {
            expect(screen.getByText(/Pause blocking on/)).toBeInTheDocument();
        });
    });

    it('disables buttons on chrome:// pages', async () => {
        mockBrowser.tabs.query.mockResolvedValue([{
            id: 1, url: 'chrome://settings', selected: true, windowId: 1,
        }]);
        mockBrowser.tabs.get.mockResolvedValue({
            id: 1, url: 'chrome://settings', selected: true, windowId: 1,
        });

        render(Pause, { exceptions });
        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            buttons.forEach(btn => expect(btn).toBeDisabled());
        });
    });
});
