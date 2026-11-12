# Custom focus session controls

## Changes
- Darken the page background so the glass panels and controls have clearer separation.
- Add independent Focus tracking and Posture tracking switches before starting a session.
- Apply blur, sound, notifications, and distraction counting only to the enabled tracker types.
- Add a quiet session-length control with common durations and an unlimited option.
- Automatically end and save the session when the selected time runs out.
- Keep the existing three-second calibration and compact two-column start screen.

## Technical details
- Keep tracking preferences separate from alert preferences so detection type and response type remain independently configurable.
- Continue using the existing on-device detector; Focus maps to looking away, while Posture maps to slouching or leaning.
- Pass the selected duration into the session flow and guard automatic completion so it runs once.
- Verify controls, timed completion, layout contrast, and the current build.
