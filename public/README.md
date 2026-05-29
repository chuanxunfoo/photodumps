# photodumps web (Netlify)

Deploy the **`public`** folder as your Netlify site publish directory.

## Public URLs (after deploy)

| Page | URL |
|------|-----|
| Legal hub | https://photodumps.netlify.app/ |
| Privacy Policy | https://photodumps.netlify.app/privacy.html |
| Terms of Service | https://photodumps.netlify.app/terms.html |
| Support | https://photodumps.netlify.app/support.html |
| Promo | https://photodumps.netlify.app/promo/ |

Short aliases (via `_redirects`): `/privacy`, `/terms`, `/support`

## App Store / Play Console

Use the **privacy** and **terms** URLs above in store listings. Support URL can be `/support.html`.

## Local preview

```bash
npm run serve:promo
```

Then open `http://localhost:3456/privacy.html` (serve runs from `public/`).
