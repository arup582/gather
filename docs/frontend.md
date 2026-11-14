# Frontend components and themes

Screens own fetching and workflows. Each shared `Gather*` component lives in a separate file in `frontend/src/components/ui/`, with public exports in `index.ts`. The wrappers use daisyUI classes for their appearance and native HTML for interaction.

## Styling and dependencies

`daisyui` is the only UI dependency beyond Next.js and React. `theme/daisyui.css` imports the pinned package's prebuilt base styles, the components used by Gather, and the Emerald, Corporate, and Night palettes. Next.js bundles these files locally. There is no Tailwind compiler, browser runtime, CDN, or remote font dependency.

| Gather component                    | daisyUI classes / behavior                           |
| ----------------------------------- | ---------------------------------------------------- |
| Button, button link                 | `btn`, `btn-primary`, `btn-outline`, `btn-error`     |
| Input, textarea, select             | `input`, `textarea`, `select`; native form controls  |
| Toggle, choice, slider              | `toggle`, `radio`, `range`; native inputs            |
| Navigation, landing section, footer | `navbar`, `menu`, `hero`, `footer`                   |
| Card, table                         | `card`, `card-border`, `table`, `row-hover`          |
| Alert, badge, loading               | `alert`, `badge`, `loading` and their modifiers      |
| Appearance drawer                   | `modal`, `modal-end`, `modal-box`; native `<dialog>` |

[Select](https://daisyui.com/components/select/) supplies the themed control and picker styles. Where customizable native selects are supported, the popup is themed too; other browsers use their native picker. `GatherSelect` accepts `value`, `onValueChange`, and an `options` array, while retaining native labels, disabled options, validation, keyboard behavior, and form submission.

[Modal](https://daisyui.com/components/modal/) recommends native dialogs. `GatherDrawer` opens one with `showModal()` and closes it with `close()`. The browser handles focus containment, Escape, and background interaction blocking; daisyUI handles appearance, transitions, and scroll locking. The wrapper adds the title/description association, trigger, backdrop dismissal, and header/body/footer composition.

Radix Select, Radix Dialog, and `get-nonce` are not required and have been removed. No replacement JavaScript UI dependency was added.

The remaining application CSS has distinct responsibilities:

- `styles.css`: application width, responsive grids, heading hierarchy, text wrapping, accessible skip-link behavior, and a small brand layer for the hero, wordmark, and event-date banners. The shell uses daisyUI navbar, menu, hero, and footer components.
- `components/ui/components.css`: shared sizing and arrangement, pagination, and drawer composition. It does not recreate button, field, table, switch, or modal skins.
- `theme/tokens.css`: user preference overrides for fonts, density, corners, width, and reduced motion. Colors use daisyUI's variables directly.
- `theme/appearance.css`: settings-panel layout and previews using the actual theme palettes.
- `theme/daisyui.css`: vendor imports only, including the palettes formerly in `palettes.css`.

daisyUI intentionally leaves [page layout and typography](https://daisyui.com/docs/layout-and-typography/) to the application. Keep the small shared layout baseline; do not rebuild component skins or move overrides into inline styles. Reusable artwork in `components/brand/` supplies the Gather mark, an illustrated gathering, and ticket motifs. These are local decorative SVGs using daisyUI color variables, so they follow palette and accent changes without image libraries, remote assets, animation, or CSS-drawn artwork.

Use a component's props for variants (`variant="secondary"`, `tone="success"`, `panel` on a form) instead of overriding its colors or interaction states in screen CSS. To add a palette, import its stylesheet in `theme/daisyui.css` and register it in `theme/config.ts`.

## Tables and pagination

Use `GatherTable` with a caption and the shared head/body/row/header/cell components. It supplies a horizontally scrollable region with a keyboard focus target. Render `GatherPagination` after the table, including empty and single-page results.

Management tables and registration history start at 10 rows with 10/20/50/100 choices. Discovery starts at 12 cards with 12/24/48/96 choices. Page and size go to the API; the browser does not download all rows and slice them. Changing size resets to page zero. Navigation includes record counts, first/previous/next/last buttons, and a validated page-number input.

Account status uses a checkbox with switch semantics. Role and status edits are saved together using the row's Save user button. The current administrator's access controls are disabled, with backend protection also enforced.

## Appearance preferences

The header's palette icon opens settings for a base theme, preset or custom accent, body and heading fonts, text size (14–20px), line height, density, corners, content width, and reduced motion. Changes apply without remounting pages. Reset defaults restores the starting configuration; the default corner setting follows the palette. System reduced-motion preferences always take precedence.

Validated preferences are stored in the non-sensitive `gather-appearance` cookie, with migration from `gather-theme`. The server renders matching attributes and a nonce-bearing stylesheet to avoid a theme flash. Colors must be six-digit hex, numeric values are bounded, and other settings use allowlists. Custom accents select black or white text by contrast. Fonts use local stacks, so their exact appearance can vary by OS.

`theme/config.ts` validates preferences; `applyAppearance.ts` applies them and persists the cookie. The production CSP still uses a per-request nonce for the preference stylesheet and Next.js scripts. Native controls do not inject additional stylesheets, so no third-party nonce helper is needed.

Component tests cover malformed preferences, disabled select options, native form values, and screen interactions. Browser tests exercise server pagination, account management, saved preferences, draft preservation, keyboard selection, modal focus and dismissal, narrow layouts, and CSP compatibility.
