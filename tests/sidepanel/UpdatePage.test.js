import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';

vi.mock('/src/js/lib/browser-api.js', () => ({
    browser: {
        tabs: { create: vi.fn() },
    },
    runtime: {
        getManifest: vi.fn().mockReturnValue({ version: '1.2.3' }),
    },
}));

vi.mock('/src/js/consts.js', () => ({
    mockAdReportId: '00000000-0000-4000-b000-000000000000',
    UNPACKED: true,
    ctrlblkHomepageUrl: 'https://ctrlblk.com/',
    ctrlblkContactUrl: 'https://ctrlblk.com/contact',
    default: {},
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

import UpdatePage from '../../src/sidepanel/UpdatePage.svelte';

describe('UpdatePage', () => {
    it('renders Update Page heading', () => {
        render(UpdatePage);
        expect(screen.getByText('Update Page')).toBeInTheDocument();
    });

    it('displays version from manifest after mount', async () => {
        render(UpdatePage);
        await waitFor(() => {
            expect(screen.getByDisplayValue('1.2.3')).toBeInTheDocument();
        });
    });

    it('renders form inputs', () => {
        const { container } = render(UpdatePage);
        const inputs = container.querySelectorAll('input');
        expect(inputs.length).toBeGreaterThanOrEqual(3);
    });

    it('renders Open update page button', () => {
        render(UpdatePage);
        expect(screen.getByText('Open update page')).toBeInTheDocument();
    });
});
