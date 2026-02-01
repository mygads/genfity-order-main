/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Toast from './Toast';

describe('Toast Component Accessibility', () => {
  it('renders error toast with role="alert" and aria-live="assertive"', () => {
    render(
      <Toast
        variant="error"
        title="Error"
        message="Something went wrong"
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders success toast with role="status" and aria-live="polite"', () => {
    render(
      <Toast
        variant="success"
        title="Success"
        message="Operation successful"
      />
    );

    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders warning toast with role="alert" and aria-live="assertive"', () => {
    render(
      <Toast
        variant="warning"
        title="Warning"
        message="Be careful"
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders info toast with role="status" and aria-live="polite"', () => {
    render(
      <Toast
        variant="info"
        title="Info"
        message="Did you know?"
      />
    );

    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('hides decorative icons from screen readers', () => {
     const { container } = render(
      <Toast
        variant="info"
        title="Info"
        message="Did you know?"
      />
    );

    // Find the svg inside the toast
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
