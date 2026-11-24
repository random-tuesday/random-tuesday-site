# Random Tuesday website

A plain static site (HTML + CSS + JS, no build step, no frameworks).

```
index.html                 the page
styles.css                 all styling (colours are at the top in :root)
script.js                  swirl background, underline animation, scrolling list
images/                    logo, vending machine, Kate's photo, "hello" background
```

## Things to fill in
Search `index.html` for `TODO`:
- **Host a Machine** and **Submit Your Art** buttons: replace `#host-a-machine` / `#submit-your-art`
  with real links (a Google Form, Typeform, or `mailto:` all work).
- **Instagram** and **Facebook** icons: replace `#instagram` / `#facebook` with the profile URLs.
- **Footer blurb**: placeholder text ("Agaro Collective..."). Replace the `<p class="footer__blurb">` text.
- **"You might find" list**: add as many `<li>` lines as you like; it scrolls up 5 at a time.

## Preview locally
Double-click `index.html`, or run `python3 -m http.server` in this folder and open http://localhost:8000.

## Publishing (all free for a site like this)
- **Netlify Drop**: go to https://app.netlify.com/drop and drag this folder onto the page. Done in 30 seconds. Add your domain under Domain settings.
- **Cloudflare Pages**: Workers & Pages → Create → Pages → "Upload assets", drag the folder. Good if the domain's DNS is already on Cloudflare.
- **GitHub Pages**: push the folder to a repo, then Settings → Pages → deploy from the main branch.

To use randomtuesday.art, point the domain's DNS at the host (each host walks you through it), then cancel Squarespace once the new site is live. Keep the email (kate@randomtuesday.art) working by leaving its MX records unchanged.
