# Key Highlights Feature — Task List

## Backend
- [ ] Create migration: add `key_highlights` JSONB column to `revision.notes`
- [ ] Update `noteModel.js` — include `key_highlights` in create/update/select
- [ ] Update `noteController.js` — read and pass `key_highlights` from request body

## Frontend — Modals
- [ ] `AddNoteModal.jsx` — add Key Highlights chip-input section (light+dark)
- [ ] `EditNoteModal.jsx` — add Key Highlights chip-input section, pre-filled (light+dark)
- [ ] `ViewNoteModal.jsx` — add Hero Card at top of note content (light+dark)

## Frontend — SubjectDetail
- [ ] Add `showHighlightsOnly` state
- [ ] Add `⚡ Highlights` toggle button in Notes tab header (light+dark)
- [ ] Add `⚡` quick-peek popover button on each note card (light+dark)
- [ ] Render condensed highlights-only view when toggle is active (light+dark)
