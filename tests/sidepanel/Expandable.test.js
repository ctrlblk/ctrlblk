import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import ExpandableWrapper from './ExpandableWrapper.svelte';

describe('Expandable', () => {
    it('renders in closed state by default', () => {
        render(ExpandableWrapper);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
        expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('opens when clicked', async () => {
        render(ExpandableWrapper);
        const label = screen.getByText('Test Label');
        await fireEvent.click(label.closest('a') || label);
        await waitFor(() => {
            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });
    });

    it('closes when clicked again', async () => {
        render(ExpandableWrapper, { state: 'open' });
        expect(screen.getByText('Test Content')).toBeInTheDocument();

        const label = screen.getByText('Test Label');
        await fireEvent.click(label.closest('a') || label);
        await waitFor(() => {
            expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
        });
    });
});
