# Deploying: Bonisa on learn., the company site on the main address

Four stages, each one checked before the next. Nothing changes for families until stage 4, and stage 4 is undone by deleting one setting.

| Address | After stage 4 |
|---|---|
| `magubanelabs.co.za` | Company site (`site/`). Old Bonisa links move to `learn.` with their cookies. The API still answers here. |
| `www.magubanelabs.co.za` | Redirects to `magubanelabs.co.za` |
| `learn.magubanelabs.co.za` | Bonisa |
| `magubane-labs.onrender.com` | Bonisa (unchanged) |

## Stage 1: push the code

Commit and push (see the commands at the end). Render deploys automatically.

`SITE_HOST` isn't set yet, so the only visible change is the name: the app says **Bonisa** on the current address.

**Check:** open `https://magubanelabs.co.za`. You see the app, the tab says Bonisa, and you can still sign in.

## Stage 2: add the learn. address

1. **Render** → the `magubane-labs` service → **Settings** → **Custom Domains** → **Add Custom Domain** → `learn.magubanelabs.co.za`. Render shows the DNS record it needs: a CNAME pointing at `magubane-labs.onrender.com`.
2. **Cloudflare** → `magubanelabs.co.za` → **DNS** → **Records** → **Add record**:
   - Type `CNAME`, name `learn`, target the value Render showed.
   - **Proxy status: set it the same as your existing `magubanelabs.co.za` record**, because that one already works with Render.
3. Back in Render, wait for the domain to show **Verified** and the certificate to be **Issued** (usually a few minutes).

**Check:**
- `https://learn.magubanelabs.co.za/api/health` shows `{"ok":true}`.
- `https://learn.magubanelabs.co.za` opens Bonisa, and you can sign in there. (Sign-in is separate per address until stage 4. That's expected.)

## Stage 3: point email links at learn.

Render → service → **Environment**:

| Key | Value |
|---|---|
| `PUBLIC_URL` | `https://learn.magubanelabs.co.za` |
| `EMAIL_FROM_NAME` | `Bonisa` (only if it's already set to something else; the code's default is now Bonisa) |
| `CONTACT_EMAIL` | `privacy@magubanelabs.co.za` (optional: shown on the privacy page for data requests) |

Save. Render redeploys.

**Check:** on the sign-in page, choose "Forgot password" for your own account. The email arrives from "Bonisa", and any button in it links to `learn.magubanelabs.co.za`.

## Stage 4: switch the main address to the company site

Render → **Environment** → add `SITE_HOST` = `magubanelabs.co.za` → Save. Render redeploys.

If `www.magubanelabs.co.za` isn't already a custom domain in Render, add it the same way as `learn.` (Cloudflare CNAME `www`). This is optional.

**Check:**
1. `https://magubanelabs.co.za` shows the company site.
2. On a browser where you were signed in to Bonisa on the old address, click **Sign in to Bonisa**. You land on `learn.magubanelabs.co.za` and **you are still signed in**.
3. On a Junior device an adult set up before the move, open the old bookmark (for example `magubanelabs.co.za/junior`). It lands on `learn.magubanelabs.co.za/junior` and **the children's names are there**.
4. `https://magubanelabs.co.za/api/health` still shows `{"ok":true}`, so tabs that were already open keep working.

**Undo:** delete `SITE_HOST` in Render → Environment → Save. The main address serves Bonisa again. Anyone who already moved stays signed in on `learn.` too.

## Notes

- The cookie handoff is kept in memory for two minutes and works once. If someone's handoff expires, they simply sign in again. For a Junior device, an adult sets the device up again from *Your children* or the class page.
- The handoff store is in memory, so this setup assumes one Render instance (as today). Before scaling to more than one instance, move it into the database.
- Email forwarding (Cloudflare Email Routing for hello@, neo@, privacy@) uses MX records and isn't affected by any of this.
