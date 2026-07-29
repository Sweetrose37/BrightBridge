# BrightBridge Approved Video Library

The mobile video library is curated. It does not contain open search, comments,
channel browsing, live chat, playlists, or automatic next-video behavior.

## Add a video without changing code

1. Open **Grown-up Area** in the mobile app and enter the existing parent PIN.
2. Choose **Manage approved videos**.
3. Paste one individual YouTube video ID or URL.
4. Choose a category and add a child-friendly title, description, age range,
   and any sensory concerns.
5. Preview the complete video.
6. Confirm that it is an individual, non-live video.
7. Enable the video and save it.

The caregiver-approved list is stored locally in
`brightbridge-approved-videos-v1`. It is not added to progress reports or
viewing history.

## Add owner-approved defaults in code

Edit `mobile/approved-videos.js`. Add a record to the `videos` array using:

```js
{
  id: "unique-local-id",
  youtubeId: "11_CHARACTER_ID",
  title: "Child-friendly title",
  description: "Short description",
  category: "speech-communication",
  thumbnailUrl: "https://i.ytimg.com/vi/11_CHARACTER_ID/hqdefault.jpg",
  enabled: true,
  sensoryNotes: "Optional warning",
  recommendedAge: "Ages 4–8",
  placeholder: false
}
```

Use only individual, public, non-live videos that permit embedding. Review the
full video before approval. Do not add playlists, live streams, age-restricted
videos, or search URLs.

## Playback and privacy

Playback uses YouTube's privacy-enhanced embedded player at
`youtube-nocookie.com`. Autoplay and looping are disabled. The app does not ask
for a YouTube login and does not store video viewing history.

YouTube controls, branding, attribution, and any ads required by YouTube remain
inside the supported player. YouTube may receive ordinary network information
when its thumbnail or embedded player is loaded.
