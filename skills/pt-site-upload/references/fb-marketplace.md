# Facebook Marketplace — Listing Reference

## Publish URL

https://www.facebook.com/marketplace/create/item

## Category Mappings

Use item title, description, and images to infer the best category:

| Category | Keywords / Use When |
|---|---|
| Garden & Outdoor | Garden furniture, plants, pots, BBQ, outdoor decor, garden tools |
| Home & Garden | Indoor furniture, home decor, shelves, lamps |
| Electronics | Computers, phones, tablets, peripherals, TVs |
| Sporting Goods | Sports equipment, bikes, fitness, camping gear |
| Toys & Games | Toys, board games, puzzles, kids items |
| Clothing & Accessories | Clothing, shoes, bags, jewelry |
| Home Appliances | Kitchen equipment, washing machines, appliances |
| Books, Movies & Music | Books, CDs, DVDs, instruments |
| Baby & Kids | Strollers, cribs, baby clothing |
| Pet Supplies | Pet accessories, food bowls, beds |

## Field Constraints

| Field | Required | Notes |
|---|---|---|
| Title | Yes | |
| Price | Yes | In euros |
| Description | Yes | |
| Condition | Yes | Default: "Used — Good" unless item says otherwise |
| Location | Yes | City or ZIP — ask user once, reuse for all |
| Images | At least 1 | Max 10, JPG/PNG |

## Navigation Tips

- Facebook's form layout changes frequently. Always use `browser_snapshot` to discover the current field structure.
- Photo upload is typically at the top of the form.
- Category selection may be a dropdown, a search field, or a clickable grid — adapt to what you see.
- Condition is usually a dropdown: New, Used — Like New, Used — Good, Used — Fair.
- Facebook does NOT require a phone number.
- Publishing may be multi-step (Next → Publish). Follow each step with screenshots.
- Listing URLs may not be immediately available after posting — check "Your Listings" if needed.
