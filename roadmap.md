# Usage review
- [ ] Replace arbitrary comments with safe feedback choices; enforce database validation, aggregate-only AI input and restricted access; test bypass attempts.
- [x] Add and verify the logo menu with browser-local profile, session settings, privacy and separate local/shared data deletion; profile persistence, settings sync and mobile menu checked.
- [x] Check outstanding errors, verify withdrawal during a session, and keep End session available while blurred; all 27 tests pass.
- [x] Finish consent control, always-available withdrawal and secure deletion of linked shared statistics and feedback.
- [x] Verify consent, deletion, cross-tab behavior and failure/retry handling.
- [x] Save generated suggestions and owner accept/decline decisions.
- [x] Add pending, accepted, and declined views to the reviewer page.
- [x] Verify anonymous usage collection and signed-out reviewer access.
- [ ] Verify live generation, "Mark as live" and impact review and decisions after reload — blocked: no owner account exists; owner must sign up and sign in at /review.