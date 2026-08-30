# Tempo AI

Build an app that allows students to manage their tasks and deadlines. The tool should be driven by an AI assistant that combines their deadlines, calendar, tasks, and personal routines to automatically create and continuously adapt a realistic schedule. The goal here is reducing time taken to manually time-block, and increasing productivity by combining all of a students tasks and deadlines into one platform.

User flow: upon signing up, new users will be asked a few questions about themselves for the AI to understand their current preferences and routines. Then the user connects their @connector:google_calendar:"Google Calendar" and canvas. For both new and existing users, the tool will automatically populate a calendar with existing assignments and obligations, and the AI will generate study blocks based on the deadlines from canvas and the preferences given. The user can manually edit and approve suggestions and the AI should adapt.

Objects/pages: calendar view, text fields, task bubbles, etc. Later we will add kanban boards and other extra features, but for now just focusing on the onboarding page with questions, the tasks page with entries, and the calendar page with task bubbles.

For now, just build the UI structure, and we will integrate the rest later. Let's go step by step. Keep it clean and sleek, with rounded fonts and minimal clutter. The way you design it should help in boosting productivity.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ffd4add-be07-40fa-bb18-7233bed5cfd5).

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
