# Posturepal Focus

Create a simple MVP web application for a focus-monitoring tool.

The app should help users stay focused while working on their computer by monitoring changes in their sitting posture through their webcam.

Build a clean, minimal desktop-first interface.

The first screen should explain that the camera will be used only for real-time posture estimation and should include a “Start Focus Session” button.

When the user starts a session, request webcam permission and show the live webcam feed.

Then create a calibration step lasting 5 seconds. Display the message “Sit in your normal focused working position” and show a countdown from 5 to 1.

After calibration, show a focus-session screen with:

 live webcam preview

 session timer

 status saying “Monitoring posture”

 button to end the session

For now, do not implement the AI posture-estimation model yet. Structure the application so that we can integrate Google MediaPipe Pose Landmarker afterward.

Use React/TypeScript and keep the code modular so the pose tracking can be added as a separate component later.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://posturepal-focus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0ae4b2a7-7053-5f23-8426-ad8c96c6eb98).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
