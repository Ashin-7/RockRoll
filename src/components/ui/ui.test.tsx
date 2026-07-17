import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ActionBar, Button, Field, FormSection, SearchableDropdown } from './index';

describe('minimal UI components', () => {
  it('renders a button and forwards click handlers', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithI18n(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a field with an accessible label', () => {
    renderWithI18n(
      <Field label="Title">
        <input />
      </Field>,
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('renders a form section legend and action bar content', () => {
    renderWithI18n(
      <FormSection title="Identity">
        <Field label="Title">
          <input />
        </Field>
        <ActionBar>
          <Button>Submit</Button>
        </ActionBar>
      </FormSection>,
    );

    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('filters and selects dropdown options', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithI18n(
      <SearchableDropdown
        label="Rank directory"
        searchLabel="Search ranks"
        searchValue=""
        onSearchChange={() => undefined}
        options={[
          { id: 'classic', label: 'Classic rock guide', meta: '496 items', value: 'classic' },
          { id: 'jazz', label: 'Jazz guide', meta: '12 items', value: 'jazz' },
        ]}
        onSelect={onSelect}
        selectLabel="Select"
      />,
    );

    expect(screen.getByRole('listbox', { name: 'Rank directory' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select Classic rock guide' }));

    expect(onSelect).toHaveBeenCalledWith('classic');
  });
});
