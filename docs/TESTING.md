# Testing guide

Serve the project locally before testing installation or offline behavior.

## Core flows

1. Open each home card and return using both page and bottom navigation.
2. In the parent area, upload or record clips for `Water` and `I want water`.
3. Add AAC words, type into the sentence box, play both exact recordings,
   favorite a word, and confirm recent words.
4. Open every flashcard set and complete every learning challenge.
5. Select a non-target answer and confirm that Pip provides a clue without
   removing a reward.
6. Use every sensory mode with touch and mouse input.
7. Play every instrument and confirm independent sound controls.
8. Complete a daily routine and a social story.
9. Verify stars, flowers, stickers, achievements, progress, and voice clips persist after
   refresh.
10. Unlock the parent dashboard with `2468`, export JSON, and test reset only on
   disposable data.

## Private memory and growth

1. Confirm Voice Journey is separate from the Family Voice Library: the former
   stores dated memories, while the latter supplies familiar prompt playback.
2. Add two recordings and test search, sorting, favorites, milestones,
   comparison, individual audio/PDF export, and a selected-recordings ZIP.
3. Create a future letter with a photo, voice link, achievement, Reward Garden
   snapshot, rich formatting, and future-reading choice.
4. Verify the keepsake print layout and Look How Far I’ve Come timeline merge
   existing communication, learning, rewards, voice, and letter history.
5. Set a birthday and check the birthday PDF/image and Journey Through Time
   slideshow. Only caregiver-selected voice memories should join the replay.
6. Preview and select every Growth Path. Confirm all history remains intact,
   mobile visuals change gradually, and stage-aware AAC words appear only once.
7. Export and restore an encrypted memory backup. Confirm an incorrect
   passphrase cannot decrypt it.

## Mobile-only tools

At widths up to 720 pixels:

1. Confirm **My Tools** and the persistent break button appear.
2. Add, reorder, complete, and remove visual schedule steps.
3. Edit both sides of a First–Then board and play matching family recordings.
4. Add two or three choices and launch distraction-free Choice Mode.
5. Capture or upload a personal photo card, play its matching voice, and remove it.
6. Confirm the family voice meter matches the Parent Voice Library.
7. Test all prompt-fading levels with a non-target learning response.
8. Start Guided Mode, verify normal navigation disappears, and exit with the PIN.
9. Export a complete backup, add disposable data, restore the backup, and verify
   profiles, settings, recordings, and photos.
10. Resize above 720 pixels and confirm all new mobile controls disappear without
    changing the original desktop layout.

## Accessibility

- Navigate all controls with Tab, Shift+Tab, Enter, Space, and Escape.
- Check visible focus, meaningful labels, heading order, and live Pip feedback.
- Test 200% browser zoom and widths of 360, 720, 1024, and 1440 pixels.
- Enable high contrast, large text, dark theme, and reduced motion individually
  and together.
- Disable speech and effects and confirm all information remains visible.

## Curated mobile videos

1. Confirm **Approved Videos** appears on Home and More without changing the
   five-item bottom navigation.
2. Confirm all nine category buttons have large touch targets and that disabled
   placeholders do not appear in the child library.
3. Unlock the existing Grown-up Area, open **Manage approved videos**, and add an
   individual non-live YouTube ID to each category.
4. Verify a title is required, malformed URLs are rejected, duplicate video IDs
   are rejected, and a non-live review confirmation is required before saving.
5. Preview, edit, disable, re-enable, and remove a disposable approved video.
6. Confirm only enabled videos appear for children and sensory notes are visible
   before playback.
7. Confirm playback never starts automatically, YouTube controls and branding
   remain present, Close Video returns to the curated shelf, and no next video
   starts automatically.
8. Test a removed, private, age-restricted, and embedding-disabled ID. Confirm
   the friendly unavailable message replaces the player.
9. Confirm there is no search, comments, live chat, channel browser, child link
   field, YouTube sign-in request, or saved viewing-history record.
10. Repeat at 320, 360, 390, 430, 600, and 720 CSS pixels with large text, dark
    mode, high contrast, and reduced motion enabled.

## Parent Video Approval

1. Confirm the parent must create a separate caregiver request code before the
   request area opens.
2. Submit a caregiver request and confirm it remains absent from every child
   video library.
3. Confirm the request appears in **Parent Dashboard → Video Approval Requests**
   after the existing Parent PIN is entered.
4. Preview without autoplay and verify an approval-history entry is created.
5. Confirm **Final Approve** remains disabled until all four confirmations and
   at least one child profile are checked.
6. Approve for one child and verify it is absent when another profile is active.
7. Reject a disposable request and confirm it never appears for children.
8. Request changes, return to caregiver request access, edit, and resubmit.
9. Withdraw a pending request and confirm it returns to Draft.
10. Approve with yesterday as the expiration date and confirm it becomes
    Expired and disappears from the child library.
11. Revoke an approved video and verify it disappears immediately while its
    audit history remains.
12. Set a short daily limit and confirm playback stops when the local allowance
    is used.
13. Confirm a caregiver data capability cannot approve, reject, edit parent
    notes, or revoke a request.
14. Restart the app and confirm requests, statuses, approvals, and audit entries
    remain stored.
15. On localhost only, test `?videoApprovalDemo=1`; confirm the demo is marked
    and that the same query on GitHub Pages creates no demo records.

## Offline and PWA

1. Load once through `localhost` or HTTPS.
2. In browser developer tools, enable Offline.
3. Refresh and navigate through all cached core activities.
4. Check the manifest and service worker in the Application panel.
