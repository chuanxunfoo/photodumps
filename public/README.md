# photodumps web (Netlify)

Deploy the **`public`** folder as your Netlify site publish directory.

## One-time setup

```bash
npx netlify-cli login
npx netlify-cli link   # pick the photodumps site
```

## Deploy (fixes 404 on privacy.html / terms.html)

From the **repo root** (`Dumplt/`):

```bash
npm run deploy:legal
```

Or drag the `public` folder onto [Netlify Drop](https://app.netlify.com/drop) (then attach the site to `photodumps.netlify.app` in site settings).

## Public URLs (after deploy)

| Page | URL |
|------|-----|
| Legal hub | https://photodumps.netlify.app/legal/ |
| Site root | https://photodumps.netlify.app/ → privacy (redirect) |
| Privacy Policy | https://photodumps.netlify.app/privacy.html |
| Terms of Service | https://photodumps.netlify.app/terms.html |
| Support | https://photodumps.netlify.app/support.html |
| Promo | https://photodumps.netlify.app/promo/ |

Short aliases (via `_redirects`): `/privacy`, `/terms`, `/support`

## App Store / Play Console

Use the **privacy** and **terms** URLs above in store listings. Support URL can be `/support.html`.

## Local preview (legal pages only)

```bash
npm run serve:promo
```

Then open `http://localhost:3456/privacy.html` (serve runs from `public/`).

**Do not put `index.html` in `public/`** — Expo’s web dev server will serve it instead of your React Native app when you run `expo start`.
