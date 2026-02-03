## 2024-05-22 - [Accessible Login Error Handling]
**Learning:** Replacing browser `alert()` with inline UI error messages significantly improves UX by not blocking the UI thread. To ensure accessibility, use `aria-invalid`, `aria-describedby`, and `role="alert"`.
**Action:** When syncing external error props to local state, use a tracker variable (e.g., `prevExternalError`) to allow the error to be cleared locally and then re-triggered even if the parent passes the same error string again.
