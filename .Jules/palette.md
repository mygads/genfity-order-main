## 2026-02-03 - Dynamic ARIA Labels for Toggles
**Learning:** Icon-only toggle buttons (like theme switchers) benefit significantly from dynamic `aria-label`s that describe the *action* (e.g., "Switch to dark mode") rather than just the component name. `ThemeContext` exposes the `theme` state, making this easy to implement without extra state.
**Action:** When working on toggle components, always check if the state is available to provide state-aware `aria-label`s.
