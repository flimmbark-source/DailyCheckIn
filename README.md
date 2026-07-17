# Body & Self Daily Check-In

A mobile-first interactive prototype for the Body & Self daily check-in.

## Current prototype

The flow intentionally stays narrow:

1. The user starts the check-in.
2. One Body & Self question appears per screen.
3. The user places themselves on a qualitative bar.
4. Their existing rituals appear beneath the bar.
5. They can add or remove rituals.
6. They continue through Sleep, Hygiene, Nourishment, Movement, Breath, and Hobbies.

The prototype does not add journaling, recommendations, desired-state questions, insight screens, or reflection mechanics to the daily flow.

## Run locally

No build step is required. Open `index.html` in a browser, or serve the folder with any static web server.

For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html` — application structure
- `styles.css` — mobile-first visual design
- `app.js` — check-in state, navigation, slider responses, and ritual management

## Prototype limitations

- Data is stored only for the current browser session and is reset on refresh.
- Category names, endpoint labels, and starter rituals are placeholders pending product decisions.
- The completion summary is included only to close the prototype flow; it is not yet a confirmed product screen.
