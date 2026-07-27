import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Gift, Home, Lock, Play, RotateCcw, ShieldCheck, Sparkles, Star, Trophy, UserRound } from 'lucide-react';
import { applyScreenTimePlan, getScreenTimeStatus, requestScreenTimeAccess } from './native/screenTime';
import type { ScreenTimeStatus } from './native/screenTime';
import { generateQuestPlan } from './lib/questPlanner';
import type { QuestPlan } from './lib/questPlanner';

const targetOptions = ['Games', 'Short video', 'Social apps', 'Streaming', 'Shopping', 'Web browsing'];
const storageKey = 'questime-test-state-v2';

type ViewMode = 'child' | 'parent';
type QuestStatus = 'not-started' | 'active' | 'waiting-approval' | 'approved' | 'reward-active';

interface QuestimeState {
  childName: string;
  goal: string;
  dailyBudgetMinutes: number;
  rewardUnlockMinutes: number;
  selectedTargets: string[];
  questPlan: QuestPlan;
  questStatus: QuestStatus;
  completedSteps: number[];
  rewardBankMinutes: number;
  parentPin: string;
  lastApprovedAt?: string;
}

const initialPlan: QuestPlan = {
  title: 'Finish math homework',
  summary: 'Do your math, show a grown-up, then earn play time.',
  steps: [
    { title: 'Start your focus quest', minutes: 5, reward: 'Quest started' },
    { title: 'Finish math homework', minutes: 25, reward: 'Ready for grown-up check' },
    { title: 'Ask a grown-up to approve', minutes: 2, reward: 'Unlock play time' },
  ],
  parentNudge: 'Check the work, then approve the reward from Parent Mode.',
};

const defaultState: QuestimeState = {
  childName: 'Maya',
  goal: 'Finish math homework',
  dailyBudgetMinutes: 90,
  rewardUnlockMinutes: 15,
  selectedTargets: ['Games', 'Short video', 'Social apps'],
  questPlan: initialPlan,
  questStatus: 'not-started',
  completedSteps: [],
  rewardBankMinutes: 0,
  parentPin: '1234',
};

const statusCopy: Record<QuestStatus, string> = {
  'not-started': 'Ready to start',
  active: 'Quest in progress',
  'waiting-approval': 'Waiting for grown-up approval',
  approved: 'Reward approved',
  'reward-active': 'Play time is unlocked',
};

const loadState = (): QuestimeState => {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultState;
    return { ...defaultState, ...JSON.parse(saved) } as QuestimeState;
  } catch {
    return defaultState;
  }
};

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('child');
  const [state, setState] = useState<QuestimeState>(loadState);
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('Ready to start');
  const [pinEntry, setPinEntry] = useState('');
  const [parentUnlocked, setParentUnlocked] = useState(false);

  const progressPercent = useMemo(() => Math.round((state.completedSteps.length / Math.max(1, state.questPlan.steps.length)) * 100), [state.completedSteps.length, state.questPlan.steps.length]);
  const selectedTargetCopy = state.selectedTargets.length ? state.selectedTargets.join(', ') : 'No apps selected';

  useEffect(() => {
    getScreenTimeStatus().then(setStatus);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const updateState = (next: Partial<QuestimeState>) => setState((current) => ({ ...current, ...next }));

  const toggleTarget = (target: string) => {
    setState((current) => ({
      ...current,
      selectedTargets: current.selectedTargets.includes(target)
        ? current.selectedTargets.filter((item) => item !== target)
        : [...current.selectedTargets, target],
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage('Making a fresh quest...');
    try {
      const plan = await generateQuestPlan({
        childName: state.childName,
        goal: state.goal,
        mode: 'focus',
        dailyBudgetMinutes: state.dailyBudgetMinutes,
        rewardUnlockMinutes: state.rewardUnlockMinutes,
        blockedTargets: state.selectedTargets,
      });
      updateState({ questPlan: plan, questStatus: 'not-started', completedSteps: [] });
      setMessage('New quest is ready for child testing.');
    } catch {
      updateState({
        questPlan: {
          ...initialPlan,
          title: `${state.childName}'s Quest`,
          summary: `Finish ${state.goal} to earn ${state.rewardUnlockMinutes} minutes of play time.`,
          steps: [
            { title: 'Start focus mode', minutes: 5, reward: 'Quest active' },
            { title: state.goal, minutes: 25, reward: 'Ready for check' },
            { title: 'Ask a grown-up to approve', minutes: 2, reward: `${state.rewardUnlockMinutes} minutes unlocked` },
          ],
          parentNudge: 'Approve only after checking the completed task.',
        },
        questStatus: 'not-started',
        completedSteps: [],
      });
      setMessage('Fallback quest is ready for child testing.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestAccess = async () => {
    const nextStatus = await requestScreenTimeAccess();
    setStatus(nextStatus);
    setMessage(nextStatus.supported ? 'Device access screen opened.' : 'Open this app on Android to allow access.');
  };

  const handleStartQuest = async () => {
    const result = await applyScreenTimePlan({
      mode: 'focus',
      blockedTargets: state.selectedTargets,
      dailyBudgetMinutes: state.dailyBudgetMinutes,
      rewardUnlockMinutes: state.rewardUnlockMinutes,
    });
    updateState({ questStatus: 'active', completedSteps: [] });
    setMessage(result.detail || 'Quest started.');
  };

  const toggleStep = (index: number) => {
    setState((current) => {
      const completed = current.completedSteps.includes(index)
        ? current.completedSteps.filter((item) => item !== index)
        : [...current.completedSteps, index].sort((a, b) => a - b);
      const allDone = completed.length >= current.questPlan.steps.length;
      return {
        ...current,
        completedSteps: completed,
        questStatus: allDone ? 'waiting-approval' : 'active',
      };
    });
    setMessage('Progress saved.');
  };

  const approveReward = () => {
    updateState({
      questStatus: 'approved',
      rewardBankMinutes: state.rewardBankMinutes + state.rewardUnlockMinutes,
      lastApprovedAt: new Date().toLocaleString(),
    });
    setMessage(`${state.childName} earned ${state.rewardUnlockMinutes} minutes.`);
  };

  const startReward = () => {
    updateState({ questStatus: 'reward-active' });
    setMessage('Reward play time started.');
  };

  const resetQuest = () => {
    updateState({ questStatus: 'not-started', completedSteps: [], rewardBankMinutes: 0 });
    setMessage('Quest reset for a clean test.');
  };

  const unlockParent = () => {
    if (pinEntry === state.parentPin) {
      setParentUnlocked(true);
      setPinEntry('');
      setMessage('Parent mode unlocked.');
    } else {
      setMessage('Wrong parent PIN. Default is 1234 for this test build.');
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><Clock3 size={25} /></div>
        <div>
          <strong>Questime</strong>
          <span>{viewMode === 'child' ? 'Child side' : 'Parent side'} test build</span>
        </div>
        <div className="reward-pill"><Star size={18} fill="currentColor" /> {state.rewardBankMinutes || state.rewardUnlockMinutes} min</div>
      </header>

      <nav className="mode-tabs" aria-label="Switch test mode">
        <button className={viewMode === 'child' ? 'active' : ''} type="button" onClick={() => setViewMode('child')}><UserRound size={18} /> Child</button>
        <button className={viewMode === 'parent' ? 'active' : ''} type="button" onClick={() => setViewMode('parent')}><ShieldCheck size={18} /> Parent</button>
      </nav>

      {viewMode === 'child' ? (
        <section className="quest-card child-card" aria-labelledby="quest-title">
          <p className="hello">Hi {state.childName}!</p>
          <h1 id="quest-title">Your quest is:</h1>
          <div className="goal-banner">{state.questPlan.title}</div>
          <p className="summary-copy">{state.questPlan.summary}</p>

          <div className={`quest-state ${state.questStatus}`}>
            <strong>{statusCopy[state.questStatus]}</strong>
            <span>{progressPercent}% complete • Reward: {state.rewardUnlockMinutes} minutes</span>
          </div>

          <ol className="kid-steps">
            {state.questPlan.steps.map((step, index) => {
              const done = state.completedSteps.includes(index);
              return (
                <li key={`${step.title}-${index}`} className={done ? 'done' : ''}>
                  <button className="step-number" type="button" onClick={() => toggleStep(index)} aria-label={`Toggle ${step.title}`}>
                    {done ? <Check size={24} /> : index + 1}
                  </button>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.minutes} min • {step.reward}</span>
                  </div>
                  {done ? <Trophy className="step-icon reward" size={26} /> : <Check className="step-icon" size={26} />}
                </li>
              );
            })}
          </ol>

          {state.questStatus === 'not-started' ? (
            <button className="start-button" type="button" onClick={handleStartQuest}>
              <Play size={25} fill="currentColor" /> Start My Quest
            </button>
          ) : state.questStatus === 'waiting-approval' ? (
            <button className="start-button waiting" type="button" onClick={() => setViewMode('parent')}>
              <ShieldCheck size={25} /> Ask Grown-up to Approve
            </button>
          ) : state.questStatus === 'approved' ? (
            <button className="start-button reward-cta" type="button" onClick={startReward}>
              <Gift size={25} /> Start Play Time
            </button>
          ) : state.questStatus === 'reward-active' ? (
            <button className="start-button reward-cta" type="button" onClick={resetQuest}>
              <RotateCcw size={25} /> Done Playing — Reset
            </button>
          ) : (
            <button className="start-button" type="button" onClick={() => toggleStep(Math.min(state.completedSteps.length, state.questPlan.steps.length - 1))}>
              <Check size={25} /> Mark Next Step Done
            </button>
          )}
          <p className="status-message" aria-live="polite">{message}</p>
        </section>
      ) : (
        <section className="quest-card parent-card" aria-labelledby="parent-title">
          <p className="hello">Grown-up dashboard</p>
          <h1 id="parent-title">Parent controls</h1>

          {!parentUnlocked ? (
            <div className="pin-card">
              <ShieldCheck size={34} />
              <strong>Enter parent PIN</strong>
              <p>Test PIN is <b>1234</b>. You can change it after unlocking.</p>
              <input inputMode="numeric" value={pinEntry} onChange={(event) => setPinEntry(event.target.value)} placeholder="1234" />
              <button className="make-button" type="button" onClick={unlockParent}>Unlock Parent Mode</button>
            </div>
          ) : (
            <div className="settings-body parent-settings">
              <div className="parent-summary">
                <div><span>Child</span><strong>{state.childName}</strong></div>
                <div><span>Status</span><strong>{statusCopy[state.questStatus]}</strong></div>
                <div><span>Progress</span><strong>{progressPercent}%</strong></div>
                <div><span>Reward bank</span><strong>{state.rewardBankMinutes} min</strong></div>
              </div>

              <label className="field"><span>Child's name</span><input value={state.childName} onChange={(event) => updateState({ childName: event.target.value })} /></label>
              <label className="field"><span>Quest goal</span><input value={state.goal} onChange={(event) => updateState({ goal: event.target.value })} /></label>

              <div className="time-grid">
                <label className="field"><span>Play-time reward</span><select value={state.rewardUnlockMinutes} onChange={(event) => updateState({ rewardUnlockMinutes: Number(event.target.value) })}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select></label>
                <label className="field"><span>Daily limit</span><select value={state.dailyBudgetMinutes} onChange={(event) => updateState({ dailyBudgetMinutes: Number(event.target.value) })}><option value="30">30 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option></select></label>
              </div>

              <fieldset>
                <legend>Apps to pause for child side</legend>
                <div className="target-grid">
                  {targetOptions.map((target) => {
                    const selected = state.selectedTargets.includes(target);
                    return <button className={selected ? 'target selected' : 'target'} key={target} type="button" onClick={() => toggleTarget(target)}>{selected ? <Check size={17} /> : <Lock size={17} />} {target}</button>;
                  })}
                </div>
                <p className="device-note">Selected: {selectedTargetCopy}</p>
              </fieldset>

              <div className="grown-up-actions">
                <button className="make-button" type="button" onClick={handleGenerate} disabled={isGenerating}><Sparkles size={19} /> {isGenerating ? 'Making...' : 'Make Quest'}</button>
                <button className="access-button" type="button" onClick={handleRequestAccess}><ShieldCheck size={19} /> Device Access</button>
                <button className="approve-button" type="button" onClick={approveReward} disabled={state.questStatus !== 'waiting-approval'}><Gift size={19} /> Approve Reward</button>
                <button className="reset-button" type="button" onClick={resetQuest}><RotateCcw size={19} /> Reset Test</button>
              </div>

              <label className="field"><span>Parent PIN</span><input inputMode="numeric" value={state.parentPin} onChange={(event) => updateState({ parentPin: event.target.value })} /></label>
              <p className="device-note">Device control: {status?.supported ? status.status : 'phone app required'}{state.lastApprovedAt ? ` • Last approval: ${state.lastApprovedAt}` : ''}</p>
              <button className="home-link" type="button" onClick={() => setViewMode('child')}><Home size={18} /> Return to Child Side</button>
            </div>
          )}
          <p className="status-message" aria-live="polite">{message}</p>
        </section>
      )}
    </main>
  );
}

export default App;
