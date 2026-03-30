---
description: Publish Gardensale catalog items to OLX Portugal and Facebook Marketplace using browser automation. Fetches items via Gardensale MCP, controls browser via Playwright MCP.
---

# Publish to Portuguese Marketplaces

Automate publishing Gardensale catalog items to OLX Portugal and Facebook Marketplace. You control a real browser — navigate pages, fill forms, upload images, and post listings. Behave like a real user.

## Prerequisites

This skill requires two MCP servers to be connected:

**Gardensale MCP** — provides item data:
- `list_catalogs()` — get user's catalogs
- `list_items({ catalog_id })` — get items in a catalog
- `get_item({ id })` — get a single item
- `get_catalog({ id })` — get catalog details (includes `contact_phone`)
- `download_item_images({ item_id, filenames })` — get image URLs for an item. Pass ALL filenames from the item's `images` array in a single call.

**Playwright MCP** (`@playwright/mcp`) — provides browser control:
- `browser_navigate` — open a URL
- `browser_click` — click an element
- `browser_type` — type into a field
- `browser_file_upload` — upload files to a file input
- `browser_select_option` — select from a dropdown
- `browser_take_screenshot` — capture what the page looks like (visual)
- `browser_snapshot` — get the accessibility tree (structured, for finding elements)
- `browser_wait_for` — wait for a condition
- `browser_scroll` — scroll the page
- `browser_evaluate` — run JavaScript in the page
- `browser_press_key` — press a keyboard key
- `browser_close` — close the browser
- `browser_launch` — ensure Chrome is running. Use this if you get ECONNREFUSED errors (Chrome was closed).
- `download_file` — download a file from a URL to a local path (no browser needed)

---

## Step 1 — Fetch Items

1. Call `list_catalogs()` and ask the user which catalog to publish from.
2. Call `list_items({ catalog_id })` to get all items.
3. Call `get_catalog({ id })` to get catalog details — note `contact_phone` if present.
4. Ask the user: **"All items, or do you want to pick specific ones?"** — just two options. Do NOT list the items upfront. If they pick specific ones, then show the list and let them choose.

## Step 1B — Check Upload Logs

Before downloading images or navigating to any marketplace, check for existing upload logs to avoid re-publishing items.

1. Read `upload-log-olx.json` and `upload-log-facebook.json` from the current working directory.
   - If a file does not exist or is empty, treat it as an empty array `[]` — this is a fresh run for that platform.
   - If a file contains malformed JSON, warn the user and treat it as empty.
2. Cross-reference fetched items against each log. An item is **already uploaded** to a platform if there is a log entry matching `item_id` with `"status": "success"`.
   - Entries with `"status": "failed"` do **not** block retries.
3. Show the user a compact status per item:
   ```
   Upload logs found:
     • Mesa de jardim — already on OLX (2026-03-28)
     • iPhone 13 Pro — already on OLX + Facebook (2026-03-27)
     • Sofá de 3 lugares — not yet uploaded

   I'll skip already-uploaded items. Want me to re-upload any of them?
   ```
4. Let the user confirm or override before proceeding.

### Log file format

Each log file is an array of objects:
```json
[
  {
    "item_id": "abc123",
    "item_title": "Mesa de jardim",
    "catalog_id": "cat1",
    "url": "https://olx.pt/listing/...",
    "published_at": "2026-03-29T14:30:00Z",
    "status": "success"
  }
]
```

---

## Step 2 — Download Images

`browser_file_upload` requires local file paths. Download all images before navigating to any marketplace.

1. For each item, call `download_item_images({ item_id, filenames })` to get the image URLs.
2. Download each image using the `download_file` tool:
```
download_file({ url: "{image_url}", dest_path: "gs-images/{item_id}/{filename}" })
```
3. Verify downloads succeeded (the tool reports file size) before proceeding.

## Step 3 — Gather User Info

Reuse saved details when possible. Only ask the user for info you don't already have.

1. **Platforms** — ask which platforms to publish to: OLX, Facebook Marketplace, or both.
2. **Location** — check if the user's location is known from previous sessions (memory). If not, ask. Example: "Lisboa", "Porto".
3. **Phone number** — check the catalog's `contact_phone` first. If empty, check if the user's phone is known from previous sessions (memory). If neither, ask. Must be in **Portuguese format** (e.g. `911 115 566`). Only needed for OLX.

Save any newly provided location or phone number to memory so you don't have to ask again next time.

## Step 4 — Infer Category

For each item, determine the best marketplace category based on its `title`, `description`, and images.

**Do NOT hardcode a single category.** Each item gets its own category.

Consult the reference docs:
- `references/olx-pt.md` — OLX Portugal category mappings
- `references/fb-marketplace.md` — Facebook Marketplace category mappings

Match item keywords to the closest category. Examples:
- "Mesa de jardim em teca" → Garden furniture → OLX: Casa e Jardim > Jardim / FB: Garden & Outdoor
- "iPhone 13 Pro 128GB" → Tech → OLX: Tecnologia > Telemóveis / FB: Electronics
- "Bicicleta de montanha" → Sports → OLX: Lazer > Desporto / FB: Sporting Goods
- "Sofá de 3 lugares" → Furniture → OLX: Casa e Jardim > Mobília / FB: Home & Garden

If you are not confident about the category, ask the user: "I think this item belongs in [category]. Is that correct?"

---

## Step 5A — OLX Portugal

Repeat for each item to publish on OLX.

### Navigate and check login

1. `browser_navigate` to `https://www.olx.pt/` (the homepage — **never** go directly to `/adding/` first, as it triggers bot detection).
2. `browser_snapshot` to check for a cookie consent banner/dialog.
3. **If a cookie banner appears**, accept all cookies by clicking the "Aceitar" or "Aceitar todos" button.
4. `browser_take_screenshot` to see the current state.
5. **If you see a login/signup page:** Tell the user "Please log in to OLX in the browser window. I'll wait." Then poll with `browser_take_screenshot` every 10 seconds until the homepage loads normally.
6. **Once the homepage is loaded**, `browser_navigate` to `https://www.olx.pt/adding/` to open the posting form.
7. `browser_take_screenshot` to verify the posting form appeared.
8. **If you see a login page on `/adding/`:** Tell the user "Please log in to OLX in the browser window. I'll wait." Poll until the form appears.

### Fill the form

The form has these sections. Fill them in order using `browser_snapshot` to find elements:

1. **Título** — type `{item.title}` (max 70 chars). After typing, OLX will **auto-suggest a category** below the title field. `browser_snapshot` to see the suggestion.
2. **Category** — OLX auto-suggests categories based on the title. If the suggestion is reasonable, click it to accept. If not, click "Alterar" to open the category picker and navigate manually.
3. **Estado** — click "Usado" (or "Novo" if appropriate).
4. **Preço** — type `{item.price}`.
5. **Descrição** — type `{item.description}`.
6. **Particular ou Profissional** — click **"Particular"**. This field is required and the form will not submit without it.
7. **Localização** — the location field may be pre-filled from the account. If it needs changing, clear it and type the user's city, then select from autocomplete.
8. **Telefone** — type the phone number in **Portuguese format** (e.g. `911 115 566`). OLX validates the format and will reject raw digits.

After filling fields, move on. Do not screenshot after every single field — be efficient.

### Upload images

1. `browser_snapshot` to find the "Choose File" button in the images section.
2. `browser_click` the "Choose File" button — this opens a file chooser dialog.
3. `browser_file_upload` with the local file paths from Step 2. OLX allows max 8 images.
4. `browser_snapshot` to verify image thumbnails appeared (look for an img element with the filename).
5. OLX may use AI to auto-fill some fields based on the uploaded image — verify these are correct.

### Review and publish

1. `browser_take_screenshot` to verify the form looks correct.
2. Click the "Publicar anúncio" button. **Do NOT ask the user for confirmation on each item** — just publish and move on to the next. Only stop if something goes wrong.
3. **Promotion upsell page** — OLX will show a "Destacar anúncio" page with paid promotion options. Click **"Não destacar"** to skip, then confirm with **"Sim, publicar"** in the dialog that appears.
4. Note the ad ID from the URL for the summary.
5. **Write to upload log** — immediately append an entry to `upload-log-olx.json`:
   ```json
   {
     "item_id": "{item.id}",
     "item_title": "{item.title}",
     "catalog_id": "{catalog_id}",
     "url": "{listing_url or null}",
     "published_at": "{ISO 8601 timestamp}",
     "status": "success"
   }
   ```
   If publishing failed, log with `"status": "failed"` and add a `"reason"` field. Write the file after each item — do not wait until the end.
6. Start the next item.

---

## Step 5B — Facebook Marketplace

Repeat for each item to publish on Facebook Marketplace.

### Navigate and check login

1. `browser_navigate` to `https://www.facebook.com/marketplace/create/item`
2. `browser_snapshot` to check the current state.
3. **If a cookie consent dialog appears**, accept all cookies.
4. **If you see a login page:** Tell the user "Please log in to Facebook in the browser window. I'll wait." Poll with `browser_snapshot` every 10 seconds, checking for "Item for sale" heading to confirm the listing form loaded. Note: `browser_wait_for` has a 5s timeout which is too short for manual login — use polling instead.

### Fill the form (Step 1 of 2)

Fill fields in order using `browser_snapshot`:

1. **Title** — `browser_type` into the "Title" textbox.
2. **Price** — `browser_type` into the "Price" textbox.
3. **Category** — click the "Category" combobox. A dropdown dialog appears with grouped categories (Home & Garden, Electronics, Clothing & Accessories, etc.). Click the best match.
4. **Condition** — click the "Condition" combobox. Select from: New, Used - Like New, Used - Good, Used - Fair. Default to "Used - Good".
5. **Description** — after selecting a category, a "More details" section expands. Find the "Description" textbox and type `{item.description}`.
6. **Location** — also in "More details". May be pre-filled from the account. If it needs changing, clear and type the user's city.

No phone number needed for Facebook Marketplace.

### Upload images

1. `browser_click` the "Add photos or drag and drop" button — this opens a file chooser dialog.
2. `browser_file_upload` with the local file paths from Step 2. Facebook allows max 10 images.
3. `browser_snapshot` to verify photos count updated (e.g. "2 / 10").

### Publish (Step 2 of 2)

1. Click **"Next"** (disabled until required fields are filled).
2. Step 2 shows "List in more places" — Marketplace is pre-selected. Click **"Publish"**.
3. Facebook redirects to "Your listings" page.
4. **"Boost your listing" dialog** may appear — click **"Close"** to skip.
5. **Do NOT ask the user for confirmation on each item** — just publish and move on to the next item.
6. **Write to upload log** — immediately append an entry to `upload-log-facebook.json`:
   ```json
   {
     "item_id": "{item.id}",
     "item_title": "{item.title}",
     "catalog_id": "{catalog_id}",
     "url": "{listing_url or null}",
     "published_at": "{ISO 8601 timestamp}",
     "status": "success"
   }
   ```
   If publishing failed, log with `"status": "failed"` and add a `"reason"` field. Write the file after each item — do not wait until the end.

---

## Step 6 — Summary

After processing all items, present a summary:

```
Published:
  ✓ {item.title} → OLX: {olx_url}
  ✓ {item.title} → Facebook Marketplace
  ✗ {item.title} → OLX: failed (reason)

Totals:
  Items in catalog: N
  Published to OLX: X
  Published to Facebook: Y
  Skipped (already uploaded): S
  Skipped/Failed: Z

Upload logs saved to: upload-log-olx.json, upload-log-facebook.json
```

---

## Error Handling

- **CAPTCHA:** If you see a CAPTCHA challenge, tell the user: "A CAPTCHA appeared. Please solve it in the browser window." Then `browser_take_screenshot` to check when it's resolved.
- **Unexpected page layout:** Take a screenshot, describe what you see, and ask the user for guidance. Do not guess blindly.
- **Upload failure:** If images don't appear after upload, retry once. If still failing, ask the user.
- **Session expired:** If the site logs you out mid-flow, ask the user to log in again.
- **Element not found:** If `browser_snapshot` doesn't show an expected element, try `browser_scroll` down, then snapshot again. The element might be below the fold.

## Browsing Principles

- **Always use `browser_snapshot`** (accessibility tree) to find interactive elements. It gives you element references you can use with `browser_click` and `browser_type`.
- **Use `browser_take_screenshot`** to verify visual state — did the upload work? Is the form filled correctly? What does the page look like?
- **Be adaptive.** Page layouts change. Never assume a fixed DOM structure. Read the page, then act.
- **Be efficient.** Don't screenshot after every tiny action. Screenshot at key checkpoints: after login, after category selection, after image upload, before publish.
- **Process items sequentially.** Finish one item completely before starting the next.
- **Between items**, navigate to `https://www.olx.pt/` first, then to `https://www.olx.pt/adding/`. Never go directly to `/adding/` — it triggers bot detection.
