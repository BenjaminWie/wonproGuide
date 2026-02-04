## 2024-05-22 - [Accessibility in Forms and Collapsibles]
**Learning:** Inputs using only placeholders are inaccessible to screen readers. Always provide a `<label>` (can be `sr-only`). For collapsible content, `aria-expanded` and `aria-controls` are essential for communicating state changes.
**Action:** Use `sr-only` labels for all form inputs and ensure proper ARIA attributes for interactive collapsible elements in future components.
