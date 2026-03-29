---
description: Publish GardenSale catalog items to Portuguese marketplaces (OLX, Facebook Marketplace). Guides the user through listing creation with copy-paste field values.
---

# Publish to Portuguese Marketplaces

Guide the user through publishing their GardenSale catalog items to OLX Portugal and Facebook Marketplace.

## Prerequisites

- The GardenSale MCP server must be connected
- The user must have at least one catalog with items

## Step 1 — Fetch items

Use the MCP tools to get the user's catalog and items:

```
list_catalogs()
```

Ask which catalog they want to publish from, then:

```
list_items({ catalog_id: "<catalog_id>" })
```

For each item, you'll have: `id`, `title`, `description`, `price`, `images[]` (filenames).

### Image URLs

Build full image URLs using this pattern:
```
{POCKETBASE_URL}/api/files/items/{item.id}/{filename}
```

Where `POCKETBASE_URL` is the PocketBase server URL (typically `http://127.0.0.1:8090` or the production URL). Present these URLs to the user so they can download/save the images for upload to each platform.

## Step 2 — Publish per platform

For each item, ask the user which platforms they want to publish to, then guide them through each one.

---

### OLX Portugal

**URL:** https://www.olx.pt/d/anuncio/publicar/

**Category:** Casa e Jardim → Jardim

| Field | Value |
|---|---|
| Título | `{item.title}` (max 70 characters) |
| Descrição | `{item.description}` |
| Preço | `{item.price}` € |
| Localização | Ask the user for their district/city |
| Telefone | Ask the user for their phone number |

**Images:** Upload all item images (max 8 on OLX). Provide the image URLs for the user to save and upload.

**Steps to guide the user:**
1. Open https://www.olx.pt/d/anuncio/publicar/
2. Select category: Casa e Jardim → Jardim
3. Fill in the fields above (provide copy-paste values)
4. Upload photos
5. Review and publish

After the user confirms the listing is live, ask them to share the listing URL.

---

### Facebook Marketplace

**URL:** https://www.facebook.com/marketplace/create/item

**Category:** Garden & Outdoor

| Field | Value |
|---|---|
| Title | `{item.title}` |
| Price | `{item.price}` |
| Description | `{item.description}` |
| Condition | Used — Good |
| Location | Ask the user for their city or ZIP code |

**Images:** Upload all item images (max 10 on Facebook Marketplace).

**Steps to guide the user:**
1. Open https://www.facebook.com/marketplace/create/item
2. Select "Item for sale"
3. Category: Garden & Outdoor
4. Fill in the fields above
5. Upload photos
6. Click "Publish"

Note: Facebook Marketplace listings may not have a stable shareable URL. Ask the user if they can share a link; if not, just note that it was published.

---

## Step 3 — Summary

After processing all items, present a summary:

- Total items in catalog: N
- Published to OLX: X items
- Published to Facebook Marketplace: X items
- Skipped: list any items the user chose not to publish and why

## Tips

- Ask the user for their district/location and phone number once at the start — reuse for all listings
- Present field values as easy copy-paste blocks
- If an item title exceeds a platform's character limit, suggest a shortened version
- Offer to process items one at a time or in batch (all platforms per item, then next item)
- If the user has many items, offer to prioritize by price or recency
