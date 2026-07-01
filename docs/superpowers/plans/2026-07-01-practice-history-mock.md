# Practice History Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent `#practice` page that displays local mock practice history records.

**Architecture:** Keep the feature inside `src/features/practice`. Use local mock data for the first MVP, render a focused history page, and wire it through the existing hash router and AppShell navigation. Do not query Supabase or change database schema.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, existing i18n provider, existing CSS token system.

---

## File Structure

- Create `src/features/practice/practice.mock.ts`: local mock records for the history page.
- Create `src/features/practice/PracticeHistoryPage.tsx`: page component that renders records and empty state.
- Create `src/features/practice/PracticeHistoryPage.css`: feature-local styles.
- Create `src/features/practice/PracticeHistoryPage.test.tsx`: tests for default records, empty state, and Chinese copy.
- Modify `src/app/routes.tsx`: add `practice` route.
- Modify `src/app/routes.test.tsx`: verify `#practice` route.
- Modify `src/app/shell/AppShell.tsx`: add Practice navigation item.
- Modify `src/App.tsx`: render `PracticeHistoryPage`.
- Modify `src/i18n/messages.ts`: add Practice History page copy.
- Modify `docs/superpowers/docs/PROJECT_STATUS.md`: update current status and next step.

## Commands

Use Node 20 without changing the global Node 8 default:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

---

### Task 1: Add Practice History Data And Page Tests

**Files:**
- Create: `src/features/practice/PracticeHistoryPage.test.tsx`
- Create in Task 2: `src/features/practice/practice.mock.ts`
- Create in Task 2: `src/features/practice/PracticeHistoryPage.tsx`

- [ ] **Step 1: Write the failing page test**

Create `src/features/practice/PracticeHistoryPage.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { PracticeHistoryPage } from './PracticeHistoryPage';

describe('PracticeHistoryPage', () => {
  it('renders local practice history records by default', () => {
    renderWithI18n(<PracticeHistoryPage />);

    expect(screen.getByText('Practice History')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('92 BPM')).toBeInTheDocument();
    expect(screen.getByText('Verse rhythm and bends')).toBeInTheDocument();
  });

  it('renders empty state when no practice records exist', () => {
    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('No practice sessions recorded yet.')).toBeInTheDocument();
  });

  it('renders Chinese messages', () => {
    window.localStorage.setItem('rcokroll.locale', 'zh-CN');

    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('练习历史')).toBeInTheDocument();
    expect(screen.getByText('还没有练习记录。')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/PracticeHistoryPage.test.tsx
```

Expected: FAIL because `PracticeHistoryPage.tsx` does not exist.

---

### Task 2: Implement Practice History Page

**Files:**
- Create: `src/features/practice/practice.mock.ts`
- Create: `src/features/practice/PracticeHistoryPage.tsx`
- Create: `src/features/practice/PracticeHistoryPage.css`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: Add local mock practice history data**

Create `src/features/practice/practice.mock.ts`:

```ts
export interface PracticeHistoryItem {
  id: string;
  songTitle: string;
  artistName: string;
  practicedOn: string;
  durationMinutes: number;
  bpm: number | null;
  focusArea: string;
  reflection: string;
}

export const localPracticeHistory: PracticeHistoryItem[] = [
  {
    id: 'practice-little-wing-2026-07-01',
    songTitle: 'Little Wing',
    artistName: 'Jimi Hendrix',
    practicedOn: '2026-07-01',
    durationMinutes: 45,
    bpm: 92,
    focusArea: 'Verse rhythm and bends',
    reflection: 'Keep the bends slower and let the vibrato settle before moving on.',
  },
  {
    id: 'practice-autumn-leaves-2026-06-30',
    songTitle: 'Autumn Leaves',
    artistName: 'Joseph Kosma',
    practicedOn: '2026-06-30',
    durationMinutes: 30,
    bpm: 80,
    focusArea: 'Shell voicings through ii-V-I',
    reflection: 'Voice leading is cleaner when the bass movement is mapped first.',
  },
  {
    id: 'practice-thrill-2026-06-29',
    songTitle: 'The Thrill Is Gone',
    artistName: 'B.B. King',
    practicedOn: '2026-06-29',
    durationMinutes: 25,
    bpm: null,
    focusArea: 'Call-and-response phrasing',
    reflection: 'Leave more space between vocal phrases before answering on guitar.',
  },
];
```

- [ ] **Step 2: Add i18n messages**

Modify `src/i18n/messages.ts` and add these keys to both locale maps.

English:

```ts
'practiceHistory.eyebrow': 'Practice archive',
'practiceHistory.title': 'Practice History',
'practiceHistory.empty': 'No practice sessions recorded yet.',
'practiceHistory.duration': 'Duration',
'practiceHistory.bpm': 'BPM',
'practiceHistory.focus': 'Focus',
'practiceHistory.reflection': 'Reflection',
'practiceHistory.noBpm': 'No BPM',
'practiceHistory.minutes': 'min',
```

Chinese:

```ts
'practiceHistory.eyebrow': '练习档案',
'practiceHistory.title': '练习历史',
'practiceHistory.empty': '还没有练习记录。',
'practiceHistory.duration': '时长',
'practiceHistory.bpm': 'BPM',
'practiceHistory.focus': '重点',
'practiceHistory.reflection': '复盘',
'practiceHistory.noBpm': '未记录 BPM',
'practiceHistory.minutes': '分钟',
```

- [ ] **Step 3: Add the page component**

Create `src/features/practice/PracticeHistoryPage.tsx`:

```tsx
import { useI18n } from '../../i18n/I18nProvider';
import { localPracticeHistory, PracticeHistoryItem } from './practice.mock';
import './PracticeHistoryPage.css';

interface PracticeHistoryPageProps {
  sessions?: PracticeHistoryItem[];
}

export function PracticeHistoryPage({ sessions = localPracticeHistory }: PracticeHistoryPageProps) {
  const { t } = useI18n();

  return (
    <section className="practice-history-page">
      <div className="practice-history-hero">
        <p className="eyebrow">{t('practiceHistory.eyebrow')}</p>
        <h1>{t('practiceHistory.title')}</h1>
      </div>

      {sessions.length === 0 ? (
        <p className="practice-history-empty">{t('practiceHistory.empty')}</p>
      ) : (
        <div className="practice-history-list">
          {sessions.map((session) => (
            <article className="practice-history-card" key={session.id}>
              <header className="practice-history-card__header">
                <div>
                  <h2>{session.songTitle}</h2>
                  <p>{session.artistName}</p>
                </div>
                <time dateTime={session.practicedOn}>{session.practicedOn}</time>
              </header>

              <dl className="practice-history-card__meta">
                <div>
                  <dt>{t('practiceHistory.duration')}</dt>
                  <dd>
                    {session.durationMinutes} {t('practiceHistory.minutes')}
                  </dd>
                </div>
                <div>
                  <dt>{t('practiceHistory.bpm')}</dt>
                  <dd>{session.bpm ? `${session.bpm} BPM` : t('practiceHistory.noBpm')}</dd>
                </div>
              </dl>

              <div className="practice-history-card__body">
                <p>
                  <strong>{t('practiceHistory.focus')}</strong>
                  {session.focusArea}
                </p>
                <p>
                  <strong>{t('practiceHistory.reflection')}</strong>
                  {session.reflection}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Add feature-local styles**

Create `src/features/practice/PracticeHistoryPage.css`:

```css
.practice-history-page {
  display: grid;
  gap: var(--space-8);
}

.practice-history-hero h1 {
  margin: var(--space-2) 0 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 7vw, 6rem);
  line-height: 0.9;
  text-transform: uppercase;
}

.practice-history-list {
  display: grid;
  gap: var(--space-4);
}

.practice-history-card {
  display: grid;
  gap: var(--space-4);
  border: 1px solid rgba(167, 162, 154, 0.16);
  border-radius: var(--radius-panel);
  background: rgba(34, 32, 31, 0.72);
  padding: var(--space-6);
}

.practice-history-card__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.practice-history-card__header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1;
  text-transform: uppercase;
}

.practice-history-card__header p,
.practice-history-card__header time,
.practice-history-card__body {
  color: var(--color-paper-muted);
}

.practice-history-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.practice-history-card__meta div {
  border-top: 1px solid rgba(167, 162, 154, 0.16);
  padding-top: var(--space-3);
}

.practice-history-card__meta dt {
  color: var(--color-silver);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.practice-history-card__meta dd {
  margin: var(--space-1) 0 0;
}

.practice-history-card__body {
  display: grid;
  gap: var(--space-3);
}

.practice-history-card__body p,
.practice-history-empty {
  margin: 0;
}

.practice-history-card__body strong {
  display: block;
  color: var(--color-paper);
  margin-bottom: var(--space-1);
}

.practice-history-empty {
  border: 1px dashed rgba(167, 162, 154, 0.26);
  border-radius: var(--radius-panel);
  color: var(--color-paper-muted);
  padding: var(--space-8);
}

@media (max-width: 720px) {
  .practice-history-card__header,
  .practice-history-card__meta {
    grid-template-columns: 1fr;
  }

  .practice-history-card__header {
    flex-direction: column;
  }
}
```

- [ ] **Step 5: Run the page test and verify it passes**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/PracticeHistoryPage.test.tsx
```

Expected: PASS, 3 tests pass.

- [ ] **Step 6: Commit page component**

Run:

```powershell
git add src/features/practice/PracticeHistoryPage.test.tsx src/features/practice/practice.mock.ts src/features/practice/PracticeHistoryPage.tsx src/features/practice/PracticeHistoryPage.css src/i18n/messages.ts
git commit -m "feat: add practice history mock page"
```

---

### Task 3: Wire Practice Route And Navigation

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/app/routes.test.tsx`
- Modify: `src/app/shell/AppShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: Update route test first**

Modify `src/app/routes.test.tsx` so the known route test includes:

```ts
expect(getRouteForHash('#practice')).toBe('practice');
```

- [ ] **Step 2: Run route test and verify it fails**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/app/routes.test.tsx
```

Expected: FAIL because `#practice` still resolves to `backstage`.

- [ ] **Step 3: Add route type and resolver entry**

Modify `src/app/routes.tsx`:

```ts
export type AppRoute = 'auth' | 'backstage' | 'songs' | 'practice' | 'archive' | 'inbox' | 'library';

const routes: Record<string, AppRoute> = {
  '#auth': 'auth',
  '#backstage': 'backstage',
  '#songs': 'songs',
  '#practice': 'practice',
  '#archive': 'archive',
  '#inbox': 'inbox',
  '#library': 'library',
};
```

- [ ] **Step 4: Add navigation copy**

Modify `src/i18n/messages.ts`:

English:

```ts
'nav.practice': 'Practice',
```

Chinese:

```ts
'nav.practice': '练习',
```

- [ ] **Step 5: Add AppShell navigation item**

Modify `src/app/shell/AppShell.tsx`:

```ts
const navItems: Array<{ href: string; labelKey: MessageKey }> = [
  { href: '#backstage', labelKey: 'nav.backstage' },
  { href: '#songs', labelKey: 'nav.songs' },
  { href: '#practice', labelKey: 'nav.practice' },
  { href: '#archive', labelKey: 'nav.archive' },
  { href: '#inbox', labelKey: 'nav.inbox' },
  { href: '#library', labelKey: 'nav.library' },
];
```

- [ ] **Step 6: Render Practice page in App**

Modify `src/App.tsx`:

```tsx
import { PracticeHistoryPage } from './features/practice/PracticeHistoryPage';
```

Add to `page` map:

```tsx
practice: <PracticeHistoryPage />,
```

- [ ] **Step 7: Run route and shell tests**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/app/routes.test.tsx src/app/shell/AppShell.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit route wiring**

Run:

```powershell
git add src/app/routes.tsx src/app/routes.test.tsx src/app/shell/AppShell.tsx src/App.tsx src/i18n/messages.ts
git commit -m "feat: route practice history page"
```

---

### Task 4: Update Status And Verify

**Files:**
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`

- [ ] **Step 1: Update project status**

Modify `docs/superpowers/docs/PROJECT_STATUS.md`:

- Add Practice History mock page to current status.
- Move next step from Practice History to Practice Statistics.
- Keep the Node 20 verification commands unchanged.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
```

Expected: PASS, all test files pass.

- [ ] **Step 3: Run build**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

Expected: PASS, `vite build` completes.

- [ ] **Step 4: Check git status**

Run:

```powershell
git status --short
```

Expected: only `docs/superpowers/docs/PROJECT_STATUS.md` is modified before the docs commit.

- [ ] **Step 5: Commit status update**

Run:

```powershell
git add docs/superpowers/docs/PROJECT_STATUS.md
git commit -m "docs: update practice history status"
```

- [ ] **Step 6: Confirm clean working tree**

Run:

```powershell
git status --short
```

Expected: no output.
