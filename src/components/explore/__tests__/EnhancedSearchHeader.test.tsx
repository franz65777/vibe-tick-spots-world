
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { useState } from 'react';
import EnhancedSearchHeader from '../EnhancedSearchHeader';

// Stub out heavy child components
vi.mock('../SmartAutocomplete', () => ({ default: () => null }));
vi.mock('../SearchFilters', () => ({ default: () => null }));

function Wrapper({ onClearSearch }: { onClearSearch: () => void }) {
  const [query, setQuery] = useState('initial query');
  return (
    <EnhancedSearchHeader
      searchQuery={query}
      onSearchQueryChange={setQuery}
      searchMode="locations"
      onSearchModeChange={() => {}}
      onClearSearch={onClearSearch}
      sortBy="proximity"
      onSortChange={() => {}}
      filters={[]}
      onFiltersChange={() => {}}
    />
  );
}

describe('EnhancedSearchHeader', () => {
  it('clears the input when clear button is clicked', async () => {
    const onClearSearch = vi.fn();
    render(<Wrapper onClearSearch={onClearSearch} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('initial query');

    const clearButton = screen.getByLabelText(/clear search/i);
    await userEvent.click(clearButton);

    expect(input).toHaveValue('');
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });
});
