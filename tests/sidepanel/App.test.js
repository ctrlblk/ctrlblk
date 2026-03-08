import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';

const mockBrowser = vi.hoisted(() => ({
    tabs: {
        query: vi.fn().mockResolvedValue([{
            id: 1, url: 'https://example.com/', selected: true, windowId: 1,
        }]),
        get: vi.fn().mockResolvedValue({
            id: 1, url: 'https://example.com/', selected: true, windowId: 1,
        }),
        captureVisibleTab: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
        reload: vi.fn(),
        create: vi.fn(),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        onCreated: { addListener: vi.fn() },
    },
    windows: { getCurrent: vi.fn().mockResolvedValue({ id: 1 }) },
}));

vi.mock('/src/js/lib/browser-api.js', () => ({
    browser: mockBrowser,
    runtime: { getManifest: vi.fn().mockReturnValue({ version: '1.2.3' }) },
    dnr: {},
    i18n: { getMessage: vi.fn(k => k) },
    sendMessage: vi.fn(),
}));

vi.mock('/src/js/consts.js', () => ({
    UNPACKED: false,
    ctrlblkHomepageUrl: 'https://ctrlblk.com/',
    ctrlblkContactUrl: 'https://ctrlblk.com/contact',
    mockAdReportId: '00000000-0000-4000-b000-000000000000',
    default: {},
}));

vi.mock('/src/js/filters.js', () => {
    const mock = {
        getExceptions: vi.fn().mockResolvedValue([]),
        addException: vi.fn(),
        removeException: vi.fn(),
        getFilterlistDetails: vi.fn().mockResolvedValue([]),
        enableFilterlist: vi.fn(),
        disableFilterlist: vi.fn(),
    };
    return { default: mock, ...mock };
});

vi.mock('/src/js/background/reportAd.js', () => ({
    getAdReports: vi.fn().mockResolvedValue([]),
    getAdReportsByDomains: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('/src/js/reportAd.js', () => ({
    createAdReportData: vi.fn().mockResolvedValue({
        page: { url: 'https://example.com/', datetime: '2024-01-01T00:00:00Z' },
        screenshot: 'data:image/png;base64,abc',
    }),
    uploadAdReport: vi.fn(),
}));

vi.mock('/src/js/background/filters.js', () => ({
    default: {
        getConfiguration: vi.fn().mockResolvedValue({
            meta: { extension: { version: '1.2.3' } },
        }),
    },
}));

vi.mock('/src/js/background/serviceWorker.js', () => ({
    getUpdateUrl: vi.fn().mockResolvedValue({
        open_update_page: false,
        update_url: '',
        reasons: [],
    }),
}));

import App from '../../src/sidepanel/App.svelte';

describe('App', () => {
    it('renders CtrlBlock brand', () => {
        render(App);
        expect(screen.getByText('CtrlBlock')).toBeInTheDocument();
    });

    it('renders Exceptions heading', async () => {
        render(App);
        await waitFor(() => {
            expect(screen.getByText('Exceptions')).toBeInTheDocument();
        });
    });

    it('renders Filter lists heading', async () => {
        render(App);
        await waitFor(() => {
            expect(screen.getByText('Filter lists')).toBeInTheDocument();
        });
    });

    it('does not render UpdatePage when UNPACKED is false', () => {
        render(App);
        expect(screen.queryByText('Update Page')).not.toBeInTheDocument();
    });
});
