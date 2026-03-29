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
4. For each item, build image URLs using this pattern:
   ```
   {POCKETBASE_URL}/api/files/items/{item.id}/{filename}
   ```
   Where `POCKETBASE_URL` is the PocketBase server URL. If you do not know it, ask the user. Common values: `http://127.0.0.1:8090` (local) or the production URL.

## Step 2 — Download Images

`browser_file_upload` requires local file paths. Download all images before navigating to any marketplace.

For each item, download its images to a temp directory:
```bash
mkdir -p /tmp/gs-images/{item_id}
curl -o "/tmp/gs-images/{item_id}/{filename}" "{image_url}"
```

On Windows, use `%TEMP%\gs-images\` instead of `/tmp/gs-images/`.

Verify downloads succeeded before proceeding.

## Step 3 — Gather User Info

Ask the user once and reuse for all listings:

1. **Location** — district/city for OLX, city or ZIP for Facebook. Example: "Lisboa", "Porto".
2. **Phone number** — check if the catalog has `contact_phone`. If yes, use it. If not, ask the user. Only needed for OLX.
3. **Platforms** — ask which platforms to publish to: OLX, Facebook Marketplace, or both.
4. **Item selection** — ask whether to publish all items or let them pick specific ones.

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

1. `browser_navigate` to `https://www.olx.pt/adding/`
2. `browser_take_screenshot` to see the current state.
3. **If you see a login/signup page:** Tell the user "Please log in to OLX in the browser window. I'll wait." Then poll with `browser_take_screenshot` every 10 seconds until the posting form appears.
4. **If you see the posting form:** Continue.

### Select category

1. `browser_snapshot` to find the category picker element.
2. Click the category picker.
3. `browser_take_screenshot` to see the category options.
4. Navigate the category tree by clicking the top-level category, then the subcategory. Use `browser_snapshot` after each click to read the available options.
5. `browser_take_screenshot` to verify the correct category is selected.

### Fill the form

1. `browser_snapshot` to find all form fields.
2. For each field, use the accessibility tree to identify the correct input element, then fill it:

| Field | Value | Tool |
|-------|-------|------|
| Título | `{item.title}` — truncate to 70 chars if needed | `browser_type` |
| Descrição | `{item.description}` | `browser_type` |
| Preço | `{item.price}` | `browser_type` |
| Telefone | catalog `contact_phone` or user-provided | `browser_type` |

3. After filling each field, move on. Do not screenshot after every single field — be efficient.

### Upload images

1. `browser_snapshot` to find the file upload input or photo upload area.
2. `browser_file_upload` with the local file paths from Step 2. OLX allows max 8 images.
3. `browser_take_screenshot` to verify image thumbnails appeared.
4. Wait a moment for uploads to process if needed.

### Fill location

1. Find the location/address field via `browser_snapshot`.
2. `browser_type` the user's city name.
3. `browser_take_screenshot` to see the autocomplete suggestions.
4. `browser_click` the correct suggestion. If no autocomplete appears, try pressing Enter or waiting.
5. `browser_take_screenshot` to verify location is set.

### Review and publish

1. `browser_scroll` down to see the full form.
2. `browser_take_screenshot` to show the user the complete listing.
3. Ask the user: "Here's the listing preview for '{item.title}'. Should I publish it?"
4. If confirmed, find and click the publish/submit button.
5. `browser_take_screenshot` to capture the confirmation page.
6. Extract the listing URL if visible. Save it for the summary.

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

1. `browser_take_screenshot` to show the complete listing.
2. Ask the user for confirmation.
3. Click "Publish" or "Next" — Facebook sometimes has multi-step publishing. Follow each step, using `browser_take_screenshot` to track progress.
4. `browser_take_screenshot` on the result page. Note that Facebook Marketplace listings may not have a stable shareable URL.

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
- **Between items**, navigate directly to the posting URL again rather than looking for a "post another" link.
