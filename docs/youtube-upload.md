# YouTube Upload Setup

FrameForge uploads videos to YouTube using the **YouTube Data API v3** with
OAuth 2.0 (offline access). This is a one-time setup — after you create a
refresh token it never expires unless you revoke it.

---

## Prerequisites

- A Google account with a YouTube channel
- Access to [Google Cloud Console](https://console.cloud.google.com)

---

## Step 1 — Create a Google Cloud Project

1. Go to <https://console.cloud.google.com> and create a new project (e.g. `frameforge`).
2. Navigate to **APIs & Services → Library**.
3. Search for **YouTube Data API v3** and click **Enable**.

---

## Step 2 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Set **Application type** to **Desktop app** (name it anything, e.g. `FrameForge CLI`).
3. Click **Create**. Copy the **Client ID** and **Client Secret** — you'll need them next.

> **Tip:** The first time you use the project you may be prompted to configure
> the OAuth consent screen. Set it to **External**, add your email as a test
> user, and skip all optional fields.

---

## Step 3 — Obtain a Refresh Token

Run the following Node.js one-liner to open the consent URL and exchange the
authorization code for a long-lived refresh token:

```bash
node -e "
const https = require('https');
const readline = require('readline');

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI  = 'urn:ietf:wg:oauth:2.0:oob';
const SCOPE         = 'https://www.googleapis.com/auth/youtube.upload';

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
  + '?client_id=' + CLIENT_ID
  + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
  + '&response_type=code'
  + '&scope=' + encodeURIComponent(SCOPE)
  + '&access_type=offline'
  + '&prompt=consent';

console.log('Open this URL in your browser:\n\n' + authUrl + '\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the authorization code here: ', code => {
  rl.close();
  const body = new URLSearchParams({
    code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
  }).toString();
  const req = https.request({ host: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      const r = JSON.parse(data);
      if (r.refresh_token) console.log('\nYOUR REFRESH TOKEN:\n' + r.refresh_token);
      else console.error('\nError:', data);
    });
  });
  req.write(body);
  req.end();
});
"
```

> You must export `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` before running
> the snippet above.

---

## Step 4 — Add Credentials to .env

```bash
YOUTUBE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
YOUTUBE_REFRESH_TOKEN=1//0gxxxxxxxxxxxxxxxxxxxx...
YOUTUBE_PRIVACY=private   # private | unlisted | public  (default: private)
```

---

## Step 5 — Test the Upload

```bash
npm run make -- --topic "Test Upload" --dry-run   # confirm no errors
npm run make -- --topic "Test Upload" --channels youtube
```

The output will include:
```
✅ youtube: { ok: true, videoId: "...", videoUrl: "https://youtube.com/watch?v=...", privacy: "private" }
```

---

## Privacy Levels

| `YOUTUBE_PRIVACY` | Behaviour |
|:--- |:--- |
| `private` | Only you can see it (default — safe for testing) |
| `unlisted` | Anyone with the link can see it |
| `public` | Publicly listed on your channel |

---

## Troubleshooting

| Error | Fix |
|:--- |:--- |
| `Token refresh failed HTTP 401` | Refresh token revoked — repeat Step 3 |
| `Token refresh failed HTTP 400: invalid_grant` | Clock skew or token expired — regenerate |
| `Resumable upload initiation failed HTTP 403` | YouTube Data API not enabled or quota exceeded |
| `Upload chunk failed HTTP 400` | File may be corrupt — verify with `ffprobe output/master.mp4` |
| Quota exceeded | YouTube default quota is 10,000 units/day; one upload ≈ 1,600 units |

---

## Quota Notes

The YouTube Data API grants **10,000 units per day** by default. A single video
upload costs approximately 1,600 units. To upload more than 6 videos per day,
request a quota increase at <https://support.google.com/youtube/contact/yt_api_form>.
