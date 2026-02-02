## 2025-05-15 - Accessibility Patterns for Chat & Interactives
**Learning:** Screen readers in this app require explicit ARIA attributes for dynamic content (citations, loading states) and icon-only buttons which were previously silent.
**Action:** Always use `sr-only` for input labels, `aria-live="polite"` for async loading indicators, and `aria-expanded`/`aria-controls` for collapsible elements like citations.
