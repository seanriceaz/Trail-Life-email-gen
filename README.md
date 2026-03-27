# Trail Life — Email Generator

A browser-based newsletter email generator for Trail Life troops. Build drag-and-drop email newsletters and copy the finished HTML straight into Gmail, Outlook, or any other email client.

**[Open the app →](https://seanrice.net/Trail-Life-email-gen/)**

## Features

- Drag-and-drop sections to reorder them
- Each section supports a title, description, detail line (date / time / location), and program-division tags (Woodlands Trails, Navigators, Adventurers)
- Live preview updates as you type
- One-click copy of the finished HTML email

## Local Development

Requires [Node.js](https://nodejs.org/en/download) (v18 or later).

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Deployment

Merging to `main` triggers a GitHub Actions workflow that builds the app and publishes it to the `gh-pages` branch automatically.
