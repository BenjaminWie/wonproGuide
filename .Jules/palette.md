## 2024-05-22 - [Login Accessibility & Loading States]
**Learning:** Replacing browser `alert()` with managed state in the Login component allows for better UX (loading spinners, inline error messages) and improved accessibility (ARIA attributes).
**Action:** Always prefer inline validation over `alert()` for better user experience and screen reader support. Use `sr-only` for hidden labels.
