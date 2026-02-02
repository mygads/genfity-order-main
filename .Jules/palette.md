## 2025-02-02 - Modal Accessibility Pattern
**Learning:** The `ConfirmDialog` component, widely used across the app, lacked standard accessibility features (ARIA roles, label association, Escape key). This meant critical confirmation flows were difficult for screen reader users.
**Action:** When auditing modals, check for `role="alertdialog"`, `aria-labelledby`/`aria-describedby` (using `useId`), and keyboard listeners for Escape.
