# Practice Statistics Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local mock Practice Statistics summary to the existing `#practice` page.

**Architecture:** Keep statistics inside the `practice` feature. A pure `calculatePracticeStatistics` function derives summary values from `PracticeHistoryItem[]`, and `PracticeHistoryPage` renders those values above the existing history list with i18n labels.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, current CSS/i18n system.

---

## File Structure

- Create: `src/features/practice/practiceStatistics.ts`
  - Owns pure statistics calculation.
  - Depends only on `PracticeHistoryItem` type.
- Create: `src/features/practice/practiceStatistics.test.ts`
  - Covers default mock data and empty data.
- Modify: `src/features/practice/PracticeHistoryPage.tsx`
  - Calls the statistics helper.
  - Renders a statistics summary between hero and history content.
- Modify: `src/features/practice/PracticeHistoryPage.css`
  - Adds styles for the statistics summary using the existing feature-local CSS pattern.
- Modify: `src/features/practice/PracticeHistoryPage.test.tsx`
  - Adds page-level expectations for summary rendering and Chinese labels.
- Modify: `src/i18n/messages.ts`
  - Adds English and Chinese labels for statistics.
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`
  - Records Practice Statistics as complete and moves next suggested work forward.

## Commands

Use command-local Node 20 so the repository's global Node 8 default is not changed:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/practiceStatistics.test.ts src/features/practice/PracticeHistoryPage.test.tsx
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

---

### Task 1: Add Practice Statistics Calculation

**Files:**
- Create: `src/features/practice/practiceStatistics.test.ts`
- Create: `src/features/practice/practiceStatistics.ts`

- [ ] **Step 1: Write the failing statistics tests**

Create `src/features/practice/practiceStatistics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localPracticeHistory } from './practice.mock';
import { calculatePracticeStatistics } from './practiceStatistics';

const unsortedSessions = [
  localPracticeHistory[1],
  localPracticeHistory[2],
  localPracticeHistory[0],
];

describe('calculatePracticeStatistics', () => {
  it('summarizes practice history records', () => {
    expect(calculatePracticeStatistics(unsortedSessions)).toEqual({
      totalSessions: 3,
      totalMinutes: 100,
      uniqueSongs: 3,
      averageMinutes: 33,
      latestPracticeDate: '2026-07-01',
    });
  });

  it('returns safe defaults for empty practice history', () => {
    expect(calculatePracticeStatistics([])).toEqual({
      totalSessions: 0,
      totalMinutes: 0,
      uniqueSongs: 0,
      averageMinutes: 0,
      latestPracticeDate: null,
    });
  });
});
```

- [ ] **Step 2: Run the failing statistics test**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/practiceStatistics.test.ts
```

Expected: FAIL because `practiceStatistics.ts` does not exist.

- [ ] **Step 3: Implement the statistics helper**

Create `src/features/practice/practiceStatistics.ts`:

```ts
import { PracticeHistoryItem } from './practice.mock';

export interface PracticeStatistics {
  totalSessions: number;
  totalMinutes: number;
  uniqueSongs: number;
  averageMinutes: number;
  latestPracticeDate: string | null;
}

export function calculatePracticeStatistics(sessions: PracticeHistoryItem[]): PracticeStatistics {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      uniqueSongs: 0,
      averageMinutes: 0,
      latestPracticeDate: null,
    };
  }

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const latestPracticeDate = sessions.reduce((latest, session) => {
    return session.practicedOn > latest ? session.practicedOn : latest;
  }, sessions[0].practicedOn);

  return {
    totalSessions: sessions.length,
    totalMinutes,
    uniqueSongs: new Set(sessions.map((session) => session.songTitle)).size,
    averageMinutes: Math.round(totalMinutes / sessions.length),
    latestPracticeDate,
  };
}
```

- [ ] **Step 4: Verify the statistics helper passes**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/practiceStatistics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the statistics helper**

Run:

```powershell
git add src/features/practice/practiceStatistics.test.ts src/features/practice/practiceStatistics.ts
git commit -m "feat: add practice statistics calculation"
```

---

### Task 2: Render Statistics On Practice History Page

**Files:**
- Modify: `src/features/practice/PracticeHistoryPage.test.tsx`
- Modify: `src/features/practice/PracticeHistoryPage.tsx`
- Modify: `src/features/practice/PracticeHistoryPage.css`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: Add failing page expectations**

Update the default render test in `src/features/practice/PracticeHistoryPage.test.tsx` to include statistics values:

```ts
expect(screen.getByText('Practice Statistics')).toBeInTheDocument();
expect(screen.getByText('Total sessions')).toBeInTheDocument();
expect(screen.getByText('3')).toBeInTheDocument();
expect(screen.getByText('Total minutes')).toBeInTheDocument();
expect(screen.getByText('100 min')).toBeInTheDocument();
expect(screen.getByText('Songs practiced')).toBeInTheDocument();
expect(screen.getByText('Average session')).toBeInTheDocument();
expect(screen.getByText('33 min')).toBeInTheDocument();
expect(screen.getByText('Latest practice')).toBeInTheDocument();
```

Update the empty-state test to include empty statistics behavior:

```ts
expect(screen.getByText('Practice Statistics')).toBeInTheDocument();
expect(screen.getAllByText('0')).toHaveLength(2);
expect(screen.getByText('0 min')).toBeInTheDocument();
expect(screen.getByText('No practice yet')).toBeInTheDocument();
```

Update the Chinese test to include one Chinese statistics label:

```ts
expect(screen.getByText('练习统计')).toBeInTheDocument();
```

- [ ] **Step 2: Run the failing page test**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/PracticeHistoryPage.test.tsx
```

Expected: FAIL because the page does not render statistics yet.

- [ ] **Step 3: Add i18n messages**

Add these keys to the English block in `src/i18n/messages.ts` near the existing `practiceHistory.*` keys:

```ts
'practiceStatistics.title': 'Practice Statistics',
'practiceStatistics.totalSessions': 'Total sessions',
'practiceStatistics.totalMinutes': 'Total minutes',
'practiceStatistics.uniqueSongs': 'Songs practiced',
'practiceStatistics.averageMinutes': 'Average session',
'practiceStatistics.latestPractice': 'Latest practice',
'practiceStatistics.noPractice': 'No practice yet',
```

Add these keys to the `zh-CN` block near the existing `practiceHistory.*` keys:

```ts
'practiceStatistics.title': '练习统计',
'practiceStatistics.totalSessions': '练习次数',
'practiceStatistics.totalMinutes': '总练习时长',
'practiceStatistics.uniqueSongs': '练习曲目数',
'practiceStatistics.averageMinutes': '平均单次时长',
'practiceStatistics.latestPractice': '最近练习',
'practiceStatistics.noPractice': '还没有练习',
```

- [ ] **Step 4: Render statistics in `PracticeHistoryPage`**

Update `src/features/practice/PracticeHistoryPage.tsx`:

```tsx
import { useI18n } from '../../i18n/I18nProvider';
import { localPracticeHistory, PracticeHistoryItem } from './practice.mock';
import { calculatePracticeStatistics } from './practiceStatistics';
import './PracticeHistoryPage.css';

interface PracticeHistoryPageProps {
  sessions?: PracticeHistoryItem[];
}

export function PracticeHistoryPage({ sessions = localPracticeHistory }: PracticeHistoryPageProps) {
  const { t } = useI18n();
  const statistics = calculatePracticeStatistics(sessions);
  const statisticItems = [
    {
      label: t('practiceStatistics.totalSessions'),
      value: statistics.totalSessions.toString(),
    },
    {
      label: t('practiceStatistics.totalMinutes'),
      value: `${statistics.totalMinutes} ${t('practiceHistory.minutes')}`,
    },
    {
      label: t('practiceStatistics.uniqueSongs'),
      value: statistics.uniqueSongs.toString(),
    },
    {
      label: t('practiceStatistics.averageMinutes'),
      value: `${statistics.averageMinutes} ${t('practiceHistory.minutes')}`,
    },
    {
      label: t('practiceStatistics.latestPractice'),
      value: statistics.latestPracticeDate ?? t('practiceStatistics.noPractice'),
    },
  ];

  return (
    <section className="practice-history-page">
      <div className="practice-history-hero">
        <p className="eyebrow">{t('practiceHistory.eyebrow')}</p>
        <h1>{t('practiceHistory.title')}</h1>
      </div>

      <section className="practice-statistics" aria-labelledby="practice-statistics-title">
        <h2 id="practice-statistics-title">{t('practiceStatistics.title')}</h2>
        <dl className="practice-statistics__grid">
          {statisticItems.map((item) => (
            <div className="practice-statistics__item" key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

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
                  <dd>{session.bpm === null ? t('practiceHistory.noBpm') : `${session.bpm} BPM`}</dd>
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

- [ ] **Step 5: Add feature-local statistics styles**

Add to `src/features/practice/PracticeHistoryPage.css` after the hero styles:

```css
.practice-statistics {
  display: grid;
  gap: var(--space-4);
  border: 1px solid rgba(167, 162, 154, 0.16);
  border-radius: var(--radius-panel);
  background: rgba(34, 32, 31, 0.72);
  padding: var(--space-6);
}

.practice-statistics h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1;
  text-transform: uppercase;
}

.practice-statistics__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.practice-statistics__item {
  border-top: 1px solid rgba(167, 162, 154, 0.16);
  padding-top: var(--space-3);
}

.practice-statistics__item dt {
  color: var(--color-silver);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.practice-statistics__item dd {
  margin: var(--space-1) 0 0;
  color: var(--color-paper);
  font-size: 1.15rem;
}
```

Update the mobile media query so the statistics grid stacks cleanly:

```css
@media (max-width: 720px) {
  .practice-statistics__grid,
  .practice-history-card__header,
  .practice-history-card__meta {
    grid-template-columns: 1fr;
  }

  .practice-history-card__header {
    flex-direction: column;
  }
}
```

- [ ] **Step 6: Verify page tests pass**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/PracticeHistoryPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit page rendering changes**

Run:

```powershell
git add src/features/practice/PracticeHistoryPage.test.tsx src/features/practice/PracticeHistoryPage.tsx src/features/practice/PracticeHistoryPage.css src/i18n/messages.ts
git commit -m "feat: show practice statistics summary"
```

---

### Task 3: Update Status And Verify Full Project

**Files:**
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`

- [ ] **Step 1: Update project status**

Update `docs/superpowers/docs/PROJECT_STATUS.md`:

- Add Practice Statistics mock summary to the current status / recently completed section.
- Move next suggested work from `Practice Statistics` to `Auth 最小闭环`.
- Keep the Node 20 command-local verification note unchanged.

- [ ] **Step 2: Run targeted practice tests**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/practice/practiceStatistics.test.ts src/features/practice/PracticeHistoryPage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit status update**

Run:

```powershell
git add docs/superpowers/docs/PROJECT_STATUS.md
git commit -m "docs: update practice statistics status"
```

---

## Self-Review

- Spec coverage: the plan covers pure statistics calculation, page rendering, i18n, tests, status update, no database work, no new route, and no new dependency.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `PracticeStatistics`, `calculatePracticeStatistics`, and `PracticeHistoryItem` are consistently named across test, implementation, and page usage.
- Scope check: the work is one focused mock MVP and does not require decomposition into multiple specs.
