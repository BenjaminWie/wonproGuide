## 2025-05-22 - Login Accessibility and Feedback
**Learning:** For fast synchronous operations like the local login check, adding a loading state with proper screen reader feedback improves perceived performance and accessibility. Using a boolean return pattern for the login callback allows the UI to manage its own loading and error states without blocking the user with native alerts.
**Action:** Use the `isLoading` pattern for all submit buttons and ensure `aria-describedby` links inputs with error messages for better screen reader reporting.
