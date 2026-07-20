# UI Primitives Phase 2 Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the first shared UI primitives, remove unrelated dependency drift, finish the existing Songs primitive migration, and migrate the Album detail hero without changing business behavior.

**Architecture:** Keep the existing React feature boundaries and pure-CSS system. Shared surface styling belongs to `src/components/ui`; feature CSS retains only layout and feature-specific typography. Each task is independently testable and committed before the next page is touched.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Vite, semantic CSS tokens.

## Global Constraints

- Work only in `E:\Code\RcokRoll-ui-tokens` on `ui/tokens-rebuild`.
- Do not run `npm install` or introduce another UI framework.
- Do not change Supabase, RLS, Auth behavior, Inbox navigation, one-click import, or `match_existing`.
- Preserve the existing recording-studio/tape visual language and hash routing.
- Use Node 20 from `C:\Users\Ashin\AppData\Local\nvm\v20.20.2` for tests and builds.
- Keep each page migration in its own commit.

---

### Task 1: Restore the dependency baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: dependency state from local `main`.
- Produces: UI branch dependency manifests identical to `main`; UI code continues using Testing Library through existing packages.

- [ ] **Step 1: Confirm the drift is unrelated to UI runtime behavior**

Run:

```powershell
git diff main -- package.json
git diff --stat main -- package-lock.json
rg -n 'node_modules/@testing-library/dom' package-lock.json
```

Expected: only the direct `@testing-library/dom` declaration is new in `package.json`; `main` already contains the package transitively; lockfile shows hundreds of unrelated changed lines.

- [ ] **Step 2: Restore both manifests from the reviewed main baseline**

The lockfile restoration is a bulk mechanical rewrite:

```powershell
git restore --source=main -- package.json package-lock.json
```

- [ ] **Step 3: Verify exact dependency parity**

Run:

```powershell
git diff --exit-code main -- package.json package-lock.json
```

Expected: exit code 0 and no output.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore(ui): restore dependency baseline"
```

### Task 2: Add characterization coverage for the first primitives

**Files:**
- Modify: `src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `Panel({ as, variant, className, aria-label })`, `SectionHeading({ as, eyebrow, title, action })`, and `StatCard({ align, label, value, detail })`.
- Produces: stable DOM and accessibility contracts for later page migrations.

- [ ] **Step 1: Extend the primitive imports**

Change the import to:

```tsx
import {
  ActionBar,
  Button,
  Field,
  FormSection,
  Panel,
  SearchableDropdown,
  SectionHeading,
  StatCard,
} from './index';
```

- [ ] **Step 2: Add focused characterization tests**

Append inside `describe('minimal UI components', ...)`:

```tsx
it('renders Panel with the requested semantic element and variant classes', () => {
  renderWithI18n(
    <Panel as="aside" aria-label="Signal summary" className="custom-panel" variant="hero">
      Signal
    </Panel>,
  );

  expect(screen.getByRole('complementary', { name: 'Signal summary' })).toHaveClass(
    'ui-panel',
    'ui-panel--hero',
    'custom-panel',
  );
});

it('renders SectionHeading with the requested heading level and optional content', () => {
  renderWithI18n(
    <SectionHeading
      action={<Button>Open</Button>}
      as="h3"
      eyebrow="Archive"
      title="Collection"
    />,
  );

  expect(screen.getByText('Archive')).toHaveClass('eyebrow');
  expect(screen.getByRole('heading', { level: 3, name: 'Collection' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
});

it('renders StatCard alignment and optional detail', () => {
  renderWithI18n(<StatCard align="right" detail="In rotation" label="Songs" value={12} />);

  expect(screen.getByText('Songs').closest('article')).toHaveClass('ui-stat-card--right');
  expect(screen.getByText('12')).toHaveClass('ui-stat-card__value');
  expect(screen.getByText('In rotation')).toHaveClass('ui-stat-card__detail');
});
```

These tests characterize already-committed behavior; no production change is expected.

- [ ] **Step 3: Run the primitive tests**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm test -- --run src/components/ui/ui.test.tsx
```

Expected: all UI primitive tests pass with no console errors.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui/ui.test.tsx
git commit -m "test(ui): cover shared display primitives"
```

### Task 3: Finish the existing Songs hero migration

**Files:**
- Modify: `src/features/songs/SongListPage.css`
- Test: `src/features/songs/SongListPage.test.tsx`

**Interfaces:**
- Consumes: `Panel variant="hero"` and `StatCard align="right"` already rendered by `SongListPage`.
- Produces: feature CSS that owns layout only and relies on shared primitives for surface styling.

- [ ] **Step 1: Record the existing behavior**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm test -- --run src/features/songs/SongListPage.test.tsx
```

Expected: current Songs tests pass before the CSS-only refactor.

- [ ] **Step 2: Remove surface declarations already owned by Panel**

Reduce `.songs-hero` to:

```css
.songs-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
}
```

Keep the existing `.songs-hero h1` typography block unchanged.

- [ ] **Step 3: Remove surface and alignment declarations already owned by StatCard**

Reduce `.songs-hero__summary` to:

```css
.songs-hero__summary {
  min-width: 12rem;
}
```

Delete the redundant `.songs-hero__summary strong` and `.songs-hero__summary span` blocks because `StatCard.css` owns those elements. Keep the existing mobile `.songs-hero__summary { text-align: left; }` override because it is a feature-specific responsive layout decision.

- [ ] **Step 4: Run Songs regression and build**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm test -- --run src/features/songs/SongListPage.test.tsx
npm run build
```

Expected: Songs tests and production build pass; only the existing chunk-size warning may remain.

- [ ] **Step 5: Commit**

```powershell
git add src/features/songs/SongListPage.css
git commit -m "refactor(songs): finish shared hero styling"
```

### Task 4: Migrate the Album detail hero

**Files:**
- Modify: `src/features/albums/AlbumDetailPage.tsx`
- Modify: `src/features/albums/AlbumDetailPage.css`
- Test: `src/features/albums/AlbumDetailPage.test.tsx`

**Interfaces:**
- Consumes: `Panel variant="hero" as="header"`, `SectionHeading as="h1"`, and existing `Button`.
- Produces: Album detail hero using shared primitives while preserving admin visibility, edit/delete actions, album loading, and hash navigation.

- [ ] **Step 1: Write the failing structural test**

Update the first Album detail test to capture the render result:

```tsx
const { container } = renderWithI18n(
  <AlbumDetailPage albumId="album-1" onLoadAlbum={vi.fn().mockResolvedValue(album)} />,
);
```

After the album loads, add:

```tsx
expect(container.querySelector('header.album-detail-hero.ui-panel--hero')).toBeInTheDocument();
expect(screen.getByRole('heading', { level: 1, name: 'Axis: Bold as Love' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm test -- --run src/features/albums/AlbumDetailPage.test.tsx
```

Expected: FAIL because the current hero is a plain `div`, not `header.ui-panel--hero`.

- [ ] **Step 3: Import and render the shared primitives**

Replace the UI import with:

```tsx
import { Button, Panel, SectionHeading } from '../../components/ui';
```

Replace the hero opening, left heading block, and closing element with:

```tsx
<Panel as="header" className="album-detail-hero" variant="hero">
  <div>
    <SectionHeading
      as="h1"
      className="album-detail-hero__heading"
      eyebrow={t('albumDetail.eyebrow')}
      title={album.title}
    />
    <p>{album.artistName || t('albums.unknown')}</p>
  </div>
  <div className="album-detail-hero__actions">
    <span>{t(albumTypeMessageKeys[album.albumType])}</span>
    {canManageAlbum ? (
      <>
        <Button aria-label="Edit album" onClick={() => startEditing(album)} type="button">
          {t('albumDetail.edit')}
        </Button>
        <Button
          aria-label="Delete album"
          disabled={isDeleting}
          onClick={handleDeleteAlbum}
          type="button"
          variant="ghost"
        >
          {t('albumDetail.delete')}
        </Button>
      </>
    ) : null}
  </div>
</Panel>
```

- [ ] **Step 4: Remove duplicated hero surface CSS**

Reduce `.album-detail-hero` to:

```css
.album-detail-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
}
```

Add:

```css
.album-detail-hero__heading {
  margin-bottom: 0;
}
```

Keep the existing Album-specific `h1` size, artist text, actions, disabled states, and responsive layout rules.

- [ ] **Step 5: Verify GREEN and regression behavior**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm test -- --run src/components/ui/ui.test.tsx src/features/albums/AlbumDetailPage.test.tsx
npm run build
```

Expected: primitive and Album detail tests pass; production build passes with only the existing chunk-size warning.

- [ ] **Step 6: Commit**

```powershell
git add src/features/albums/AlbumDetailPage.tsx src/features/albums/AlbumDetailPage.css src/features/albums/AlbumDetailPage.test.tsx
git commit -m "refactor(albums): migrate detail hero primitives"
```

### Task 5: Update UI branch status and perform visual smoke

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

**Interfaces:**
- Consumes: verification evidence from Tasks 1-4.
- Produces: accurate next-session scope and visual verification record.

- [ ] **Step 1: Start the existing Vite development server**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL without installing packages.

- [ ] **Step 2: Inspect desktop and narrow layouts**

Open `/#songs` and one available `/#album/<id>` route. Verify:

- hero borders, backgrounds, radii, and padding come from shared primitives without doubling;
- Songs count card remains right-aligned on desktop;
- Album title, artist, album type, and admin actions retain their hierarchy;
- narrow layout stacks without overflow;
- console has no new errors.

- [ ] **Step 3: Record exact results in the three handoff documents**

Document changed files, test counts, build result, visual routes/viewports, remaining dependency or styling risks, and the next single page to migrate.

- [ ] **Step 4: Run final checks**

Run:

```powershell
$env:PATH='C:\Users\Ashin\AppData\Local\nvm\v20.20.2;' + $env:PATH
npm test -- --run src/components/ui/ui.test.tsx src/features/songs/SongListPage.test.tsx src/features/albums/AlbumDetailPage.test.tsx
npm run build
git diff --check -- src/components/ui src/features/songs src/features/albums docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

Expected: all selected tests and production build pass; no whitespace errors; only the existing chunk-size warning may remain.

- [ ] **Step 5: Commit**

```powershell
git add docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
git commit -m "docs: record ui phase 2 slice"
```
