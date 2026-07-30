# Deployment guide

LumiTalk is a static application with no build step.

## Requirements

- Serve the repository root.
- Use HTTPS in production so service workers and installation are available.
- Preserve JSON, SVG, JavaScript, CSS, and manifest MIME types.
- Do not rewrite `service-worker.js` to `index.html`.
- Set a short cache duration for `service-worker.js`; it manages versioned asset
  caching itself.

## Release checklist

1. Update the cache name in `service-worker.js`.
2. Run the full testing guide.
3. Confirm the new service worker activates after refresh.
4. Test installation on Android, iOS Safari, and a desktop browser.
5. Verify that no external requests, analytics, or trackers were introduced.
