FLOWERY PHONE v0.4 — GigaChat integration

WHAT'S NEW
- Replaces the old browser-side Gemini key with a Netlify serverless function.
- The GigaChat Authorization Key is read only from the server environment variable GIGACHAT_AUTH_KEY.
- Chat history, character prompt, user name and local memory are sent to the server for each reply.
- Existing localStorage chat, notes, memory and images remain in the app.

DEPLOYMENT
1. Upload the contents of this folder to the GitHub repository connected to your Netlify site.
2. In Netlify: Site configuration > Environment variables, add:
   Key: GIGACHAT_AUTH_KEY
   Value: your GigaChat Authorization Key
   Scope: Functions (or All scopes)
3. Save and trigger a new deploy.
4. Open the site and send a test message to Flowery.

IMPORTANT
- Never put the Authorization Key in index.html, GitHub, README, or chat messages.
- GigaChat OAuth token requests use GIGACHAT_API_PERS and the official OAuth endpoint.
- The default model is GigaChat-3-Ultra. If your project does not have access, set GIGACHAT_MODEL to a model available in your GigaChat project.
- TLS certificate verification is NOT disabled. If Netlify reports a certificate error, install/configure the official Russian Trusted Root CA certificate for the function runtime; do not turn off TLS verification.
- Netlify Functions are required; this folder must be deployed through a Git-connected Netlify site or Netlify CLI. A drag-and-drop static deploy alone will not run the function.
