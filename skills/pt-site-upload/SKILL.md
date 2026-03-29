---
description: Publish GardenSale catalog items to OLX Portugal and Facebook Marketplace using browser automation. Fetches items via GardenSale MCP, controls browser via Playwright MCP.
---

# Publish to Portuguese Marketplaces

Automate publishing GardenSale catalog items to OLX Portugal and Facebook Marketplace. You control a real browser — navigate pages, fill forms, upload images, and post listings. Behave like a real user.

## Prerequisites

This skill requires two MCP servers to be connected:

**GardenSale MCP** — provides item data:
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

---

## Step 1 — Fetch Items

1. Call `list_catalogs()` and ask the user which catalog to publish from.
2. Call `list_items({ catalog_id })` to get all items.
3. Call `get_catalog({ id })` to get catalog details — note `contact_phone` if present.
4. Ask the user: **"All items, or do you want to pick specific ones?"** — just two options. Do NOT list the items upfront. If they pick specific ones, then show the list and let them choose.

## Step 2 — Download Images

`browser_file_upload` requires local file paths. Download all images before navigating to any marketplace.

1. For each item, call `download_item_images({ item_id, filenames })` to get the image URLs.
2. Download each image to a local directory using `curl`:
```bash
mkdir -p gs-images/{item_id}
curl -o "gs-images/{item_id}/{filename}" "{image_url}"
```
3. Verify downloads succeeded (non-zero file sizes) before proceeding.

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
4. Note the ad ID from the URL for the summary, then immediately start the next item.

---

## Step 5B — Facebook Marketplace

Repeat for each item to publish on Facebook Marketplace.

### Navigate and check login

1. `browser_navigate` to `https://www.facebook.com/marketplace/create/item`
2. `browser_take_screenshot` to see the current state.
3. **If you see a login page:** Tell the user "Please log in to Facebook in the browser window. I'll wait." Poll with `browser_take_screenshot` until the listing form appears.

### Upload images

Facebook typically shows the photo upload area at the top of the form.

1. `browser_snapshot` to find the upload input.
2. `browser_file_upload` with local file paths. Facebook allows max 10 images.
3. `browser_take_screenshot` to verify uploads.

### Fill the form

1. `browser_snapshot` to find form fields.
2. Fill each field:

| Field | Value | Tool |
|-------|-------|------|
| Title | `{item.title}` | `browser_type` |
| Price | `{item.price}` | `browser_type` |
| Description | `{item.description}` | `browser_type` |
| Condition | "Used — Good" (unless description says otherwise) | `browser_click` or `browser_select_option` |

3. No phone number needed for Facebook Marketplace.

### Select category

1. Find the category field via `browser_snapshot`.
2. Click it and `browser_take_screenshot` to see options.
3. Select the inferred category. Navigate dropdowns or search fields as needed.

### Fill location

1. Find the location field via `browser_snapshot`.
2. `browser_type` the user's city.
3. Wait for and select the autocomplete suggestion.

### Review and publish

1. Click "Publish" or "Next" — **do NOT ask for confirmation on each item**, just publish and move on. Facebook sometimes has multi-step publishing. Follow each step.
2. Note the result, then immediately start the next item.

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
  Skipped/Failed: Z
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
