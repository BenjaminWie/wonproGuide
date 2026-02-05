## 2024-05-22 - Replacing Alerts with Inline Error States
**Learning:** Browser alerts are disruptive and non-accessible. Using state-driven inline error messages allows for a more integrated UX and better accessibility (using ARIA roles like 'alert').
**Action:** Always prefer inline validation messages with proper ARIA attributes over browser native dialogs for form validation.

## 2024-05-22 - Derived State Pattern for Syncing Props
**Learning:** When a child component needs to manage a prop's value locally (e.g., clearing an error message), use a 'derived state' pattern with a tracker variable to ensure prop updates are still captured without causing infinite loops or missing updates.
**Action:** Use the tracker pattern (prevProp) inside the component body to sync external props to local state when local overrides are possible.
