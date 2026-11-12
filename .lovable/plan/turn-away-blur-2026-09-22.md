# Turn-away blur

## What will change
- Add private, on-device face-direction tracking during an active focus session.
- Estimate whether the user is facing the screen from facial landmarks; require a short sustained turn before triggering to avoid flicker.
- Blur the app while the user is turned away and show a clear “Look back to continue” message above the blur.
- Remove the blur promptly when the user faces the screen again.
- Keep camera frames local and stop detection when the session ends.

## Technical details
- Use MediaPipe Face Landmarker loaded only in the browser, with its model stored in the app.
- Derive horizontal head direction from the nose position relative to the face sides, with smoothing and separate enter/exit thresholds.
- Extend the existing monitor to report attention state to the session screen.
- Verify the full session flow with a simulated webcam, plus fallback behavior if face tracking cannot initialize.
