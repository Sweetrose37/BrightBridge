# LumiTalk Approved Video Library

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

## Caregiver requests and Parent approval

Requests and immutable audit entries are stored locally in
`brightbridge-video-approvals-v1`.

1. A parent opens **Grown-up Area → Video Approval Requests** and creates a
   separate 4–8 digit caregiver request code.
2. A caregiver opens **More → Request a Video**, enters that request code and
   their role details, then submits an individual YouTube video.
3. The request remains **Pending Parent Approval** and is not copied into the
   child library.
4. The parent previews it, selects the child profile or profiles, completes all
   four confirmations, chooses viewing controls, and gives final approval.
5. Rejected, changes-requested, expired, disabled, unassigned, or revoked
   records never appear for a child.

Caregiver and parent role capabilities are issued separately. Caregiver data
methods can create, edit, resubmit, and withdraw their own requests, but the
data layer rejects approval, rejection, and revocation calls unless they carry
the Parent-PIN capability.

Because this project has no backend or account system, requests synchronize
only on the same browser/device. A production multi-device workflow would
require an authenticated backend and server-side authorization rules.

For local development only, append `?videoApprovalDemo=1` while using
`localhost` or `127.0.0.1` to seed one clearly marked demo request. Production
GitHub Pages never seeds demo requests.

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
for a YouTube login and does not store a viewing-history list. When a parent
sets a daily limit, it stores only a local per-day aggregate number of seconds
for internal child/video IDs so the limit can be enforced.

YouTube controls, branding, attribution, and any ads required by YouTube remain
inside the supported player. YouTube may receive ordinary network information
when its thumbnail or embedded player is loaded.
