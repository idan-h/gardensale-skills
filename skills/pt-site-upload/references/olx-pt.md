# OLX Portugal — Listing Reference

## Publish URL

https://www.olx.pt/adding/

## Category Mappings

Use item title, description, and images to infer the best category:

| Category Path | Keywords / Use When |
|---|---|
| Casa e Jardim → Jardim | Garden furniture, plants, outdoor items, pots, BBQ, garden tools |
| Casa e Jardim → Mobília | Indoor furniture, shelves, tables, chairs, sofas, beds |
| Casa e Jardim → Decoração | Decorative items, frames, vases, candles, mirrors |
| Casa e Jardim → Electrodomésticos | Appliances, kitchen equipment, washing machines |
| Lazer → Desporto | Sports equipment, bikes, fitness, camping |
| Lazer → Livros e Revistas | Books, magazines, comics |
| Lazer → Música e Filmes | CDs, DVDs, vinyl, instruments |
| Tecnologia → Informática | Computers, peripherals, monitors, printers |
| Tecnologia → Telemóveis | Phones, tablets, smartwatches |
| Tecnologia → TV, Som e Imagem | TVs, speakers, cameras |
| Tecnologia → Consolas e Videojogos | Game consoles, video games |
| Bebé e Criança → Brinquedos | Toys, kids items |
| Bebé e Criança → Roupa de Bebé e Criança | Kids clothing |
| Moda → Roupa | Clothing, shoes |
| Moda → Acessórios | Bags, watches, jewelry |
| Animais → Acessórios para Animais | Pet accessories, cages, beds |

## Field Constraints

| Field | Max Length | Required | Notes |
|---|---|---|---|
| Título | 70 chars | Yes | Truncate and suggest shortened version if needed |
| Descrição | 9000 chars | Yes | |
| Preço | — | Yes | In euros, integer or decimal |
| Localização | — | Yes | District/city — ask user once, reuse for all |
| Telefone | — | Yes | Use catalog `contact_phone` if available. Format: +351XXXXXXXXX |
| Images | Max 8 | At least 1 | JPG/PNG, max 10MB each |

## Navigation Tips

- **IMPORTANT: Never navigate directly to `/adding/`.** OLX has bot detection (DataDome) that blocks direct access to the posting page. Always navigate to `https://www.olx.pt/` first, wait for it to load, then navigate to `/adding/`.
- **Cookie consent:** OLX shows a cookie banner on first visit. Accept all cookies ("Aceitar" / "Aceitar todos") before doing anything else — some page functionality may not work until cookies are accepted.
- The category picker is a multi-level clickable tree. Use `browser_snapshot` to read options at each level.
- After clicking a top-level category, subcategories appear. Snapshot again to see them.
- Location field has autocomplete — type the city, wait for suggestions, click the right one.
- OLX may require login — if redirected to login, tell the user to log in manually.
- After posting, OLX shows a confirmation page with the listing URL — capture it.
