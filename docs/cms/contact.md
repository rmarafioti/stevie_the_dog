# Contact Form

How a client website sends its contact form through the Headless CMS, which emails each message to the website's site owners with the visitor as Reply-To and up to 3 photos attached. It builds on `client-website.md` in this folder: the same API URL and key, called from the server only. It replaces a per-site email service such as EmailJS: the site needs no email account or template of its own.

The form is set up with the client, not in the CMS dashboard: which questions it asks and whether it takes photos are decided for each site and recorded in `docs/site.md`. The CMS takes the same request from every site, whatever the form looks like.

## The contact route

POST {HEADLESS_CMS_API_URL}/api/public/contact, server side only (a Server Action or a route handler, never the browser), with these headers:

- Authorization: Bearer `<HEADLESS_CMS_API_KEY>`
- X-CSRF-Protection: 1 (the CMS refuses any POST without it)
- Content-Type: application/json

Body:

```
{ name, email, message?, extras?: [{ label, value }], images?: [{ content }] }
```

- name: required, at most 100 characters. email: required, a valid address; the site owner's reply goes to it.
- message: optional, at most 5000 characters, line breaks kept, plain text.
- extras: the form's own questions, at most 10, each { label, value }: label is the question as the site owner should read it ("Dog's name"), at most 60 characters; value the visitor's answer, at most 1000. An extra with a blank value is dropped, so send optional questions as they are. The email lists them as "label: value", in the order sent.
- images: at most 3, each { content }, the file in base64 with no data: prefix. Each must be a jpg, png or webp of at most 1 MB, checked by its bytes. The CMS names the files itself and never stores them.

Success: 201 { "data": { "received": true } }. The visitor gets no email: the site shows its own thank-you.

Errors arrive as { "error": { "message": "...", "fields"?: { ... } } }:

- 400 "Please fix the highlighted fields." with fields keyed by path: name, email, message, extras.0.value, images.1.content. Show a field's message next to that field. A message on extras.N.label or extras, or an image message the form can't fix, is a bug in the site's code: show a general error.
- 401 "Invalid API key." as in `client-website.md` → The API this website calls.
- 413 "Request body is too large." when the body is over 5 MB: shrink the photos (Photos below).
- 429 "Too many requests. Please try again later." when this website sent more than 20 messages in an hour. This limit is the form's own: it never counts against the content routes' 30 a minute.
- 500 "Something went wrong, please try again."

## The honeypot

The CMS has no spam check of its own for this route, so the form must have a honeypot: a field hidden from people (visually hidden, tabIndex={-1}, autoComplete="off", aria-hidden) that only a bot fills, named so browser autofill has no category for it, such as contactCode. The server checks it before calling the CMS: when it holds anything, answer as if the message was sent and call nothing, so a bot can't tell it was caught. The CMS's 20 an hour is the backstop for a bot that gets past it.

## Photos

A site that takes photos shrinks each one in the browser before sending, so 3 photos fit under the 4.5 MB a Vercel function accepts:

- Let the visitor pick at most 3 files, accepting image/jpeg, image/png and image/webp.
- Decode each with createImageBitmap(file, { imageOrientation: "from-image" }) (so a phone photo stays upright), draw it on a canvas scaled so its long side is at most 1600 px (never up), and re-encode it with canvas.toBlob(callback, "image/jpeg", 0.8). Re-encoding also strips the photo's metadata, including a phone's GPS location, so it never leaves the browser.
- A shrunk photo is usually 200 to 600 KB. If one is still over 1 MB, encode it again at a lower quality, or tell the visitor to pick another.
- Send the shrunk files to the server as FormData, and turn each into base64 there: Buffer.from(await file.arrayBuffer()).toString("base64").
- A Server Action accepts 1 MB by default. Raise it to fit 3 photos in next.config (experimental.serverActions.bodySizeLimit: "4mb" in Next.js 15 and 16; check the installed version's docs, `client-website.md` → Check the installed Next.js version).

## The send function

Send through one server-only function, src/app/\_lib/sendContactMessage.js, which the form's Server Action calls. A sketch, to adapt to the site's form:

```js
// Server action: sends a contact message through the Headless CMS, which
// emails it to the site owners. Server-only: the API key never reaches the
// browser. Nothing is logged.
"use server";

export async function sendContactMessage(formData) {
  // A bot filled the hidden honeypot field: answer as if sent, send nothing.
  if (formData.get("contactCode")) return { isSent: true };

  const images = await Promise.all(
    formData
      .getAll("photos")
      .filter((file) => file.size > 0)
      .map(async (file) => ({
        content: Buffer.from(await file.arrayBuffer()).toString("base64"),
      })),
  );

  try {
    const response = await fetch(
      `${process.env.HEADLESS_CMS_API_URL}/api/public/contact`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HEADLESS_CMS_API_KEY}`,
          "X-CSRF-Protection": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          extras: [{ label: "Phone", value: formData.get("phone") }],
          images,
        }),
      },
    );
    if (response.ok) return { isSent: true };
    const { error } = await response.json();
    return { isSent: false, status: response.status, fields: error?.fields };
  } catch {
    // A network failure is reported the same way as an error response.
    return { isSent: false };
  }
}
```

- Validate the fields in the browser first, with the same limits, so the visitor sees a message before sending; the CMS checks them again.
- Never log the form's values, the key or the response.
- Without HEADLESS_CMS_API_URL set, the form can't send: show the general error rather than pretend it was sent.

## Testing

Beside `client-website.md` → Testing, with the CMS running locally:

- Send the form with only the required fields, with every extra question, and with 1 and 3 photos: each answers 201, and the CMS operator confirms the message was saved with the right photo count.
- A filled honeypot shows the thank-you and calls nothing.
- A bad email shows its field message; a photo that isn't an image, or a fourth photo, is refused in the browser.
- Locally the CMS sends no email; the CMS operator checks a real email, photos attached, on a test send.

## Done when

- The form sends through one server-only sendContactMessage, with the Bearer API key and X-CSRF-Protection: 1, and the key never reaches the browser
- The form has a honeypot, checked on the server before the CMS is called
- Field messages from a 400 show next to their fields, and 413, 429 and other failures show a general error
- Photos, where the site takes them, are at most 3, shrunk in the browser to a 1600 px jpg, and fit the Server Action's raised body limit
- npm test passes: sendContactMessage is tested (the honeypot, a 201, a 400 with fields, a network failure)
- Any old email service (EmailJS) and its env vars are removed
