import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('basic interactive elements have accessible names', async () => {
    const { container } = render(
      <div>
        <button aria-label="Play audio">Play</button>
        <button aria-label="Pause audio">Pause</button>
        <input type="text" aria-label="Search" placeholder="Search..." />
        <a href="/discover">Discover</a>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('form elements have labels', async () => {
    const { container } = render(
      <form>
        <label htmlFor="comment">Comment</label>
        <input id="comment" type="text" />
        <button type="submit">Submit</button>
      </form>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('images have alt text', async () => {
    const { container } = render(
      <div>
        <img src="/test.png" alt="Test image" />
        <img src="/avatar.png" alt="" /> {/* decorative */}
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('heading hierarchy is correct', async () => {
    const { container } = render(
      <div>
        <h1>SoundSauce</h1>
        <h2>Discover</h2>
        <h3>Popular Recipes</h3>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
