import { useEffect, useState } from 'react';
import { Check, ChevronDown, Clock3, Lock, Play, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { applyScreenTimePlan, getScreenTimeStatus, requestScreenTimeAccess } from './native/screenTime';
import type { ScreenTimeStatus } from './native/screenTime';
import { generateQuestPlan } from './lib/questPlanner';
import type { QuestPlan } from './lib/questPlanner';

const targetOptions = ['Games', 'Short video', 'Social apps', 'Streaming', 'Shopping', 'Web browsing'];

const initialPlan: QuestPlan = {
  title: 'Finish math homework',
  summary: 'Do your math, show a grown-up, then earn play time.',
  steps: [
    { title: 'Do your math homework', minutes: 25, reward: 'Keep going' },
    { title: 'Show it to a grown-up', minutes: 5, reward: 'Get a check' },
    { title: 'Play for 15 minutes', minutes: 15, reward: 'You earned it' },
  ],
  parentNudge: 'Check the work, then tap Unlock Play Time.',
};

function App() {
  const [childName, setChildName] = useState('Maya');
  const [goal, setGoal] = useState('Finish math homework');
  const [dailyBudgetMinutes, setDailyBudgetMinutes] = useState(90);
  const [rewardUnlockMinutes, setRewardUnlockMinutes] = useState(15);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['Games', 'Short video', 'Social apps']);
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [questPlan, setQuestPlan] = useState<QuestPlan>(initialPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('Ready to start');

  useEffect(() => {
    getScreenTimeStatus().then(setStatus);
  }, []);

  const toggleTarget = (target: string) => {
    setSelectedTargets((current) =>
      current.includes(target) ? current.filter((item) => item !== target) : [...current, target],
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage('Making your quest...');
    try {
      const plan = await generateQuestPlan({
        childName,
        goal,
        mode: 'focus',
        dailyBudgetMinutes,
        rewardUnlockMinutes,
        blockedTargets: selectedTargets,
      });
      setQuestPlan(plan);
      setMessage('Your quest is ready!');
    } catch {
      setQuestPlan({
        ...initialPlan,
        title: goal,
        steps: [
          { title: goal, minutes: 25, reward: 'Keep going' },
          { title: 'Show it to a grown-up', minutes: 5, reward: 'Get a check' },
          { title: `Play for ${rewardUnlockMinutes} minutes`, minutes: rewardUnlockMinutes, reward: 'You earned it' },
        ],
      });
      setMessage('Your quest is ready!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestAccess = async () => {
    const nextStatus = await requestScreenTimeAccess();
    setStatus(nextStatus);
    setMessage(nextStatus.supported ? 'Device access is ready' : 'Open this app on a phone to allow access');
  };

  const handleApply = async () => {
    const result = await applyScreenTimePlan({
      mode: 'focus',
      blockedTargets: selectedTargets,
      dailyBudgetMinutes,
      rewardUnlockMinutes,
    });
    setMessage(result.detail);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><Clock3 size={25} /></div>
        <strong>Questime</strong>
        <div className="reward-pill"><Star size={18} fill="currentColor" /> {rewardUnlockMinutes} min</div>
      </header>

      <section className="quest-card" aria-labelledby="quest-title">
        <p className="hello">Hi {childName}!</p>
        <h1 id="quest-title">Your quest is:</h1>
        <div className="goal-banner">{questPlan.title}</div>

        <ol className="kid-steps">
          {questPlan.steps.slice(0, 3).map((step, index) => (
            <li key={`${step.title}-${index}`}>
              <span className="step-number">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <span>{index === 0 ? 'Start here' : index === 1 ? 'Ask for a check' : `${rewardUnlockMinutes} minutes of fun`}</span>
              </div>
              {index === 2 ? <Star className="step-icon reward" size={26} /> : <Check className="step-icon" size={26} />}
            </li>
          ))}
        </ol>

        <button className="start-button" type="button" onClick={handleApply}>
          <Play size={25} fill="currentColor" />
          <span>Start My Quest</span>
        </button>
        <p className="status-message" aria-live="polite">{message}</p>
      </section>

      <details className="grown-up-panel">
        <summary><span><ShieldCheck size={20} /> Grown-up settings</span><ChevronDown size={20} /></summary>
        <div className="settings-body">
          <label className="field">
            <span>Child's name</span>
            <input value={childName} onChange={(event) => setChildName(event.target.value)} />
          </label>
          <label className="field">
            <span>What should they finish?</span>
            <input value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>

          <div className="time-grid">
            <label className="field">
              <span>Play-time reward</span>
              <select value={rewardUnlockMinutes} onChange={(event) => setRewardUnlockMinutes(Number(event.target.value))}>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </label>
            <label className="field">
              <span>Daily limit</span>
              <select value={dailyBudgetMinutes} onChange={(event) => setDailyBudgetMinutes(Number(event.target.value))}>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend>Apps to pause</legend>
            <div className="target-grid">
              {targetOptions.map((target) => {
                const selected = selectedTargets.includes(target);
                return (
                  <button className={selected ? 'target selected' : 'target'} key={target} type="button" onClick={() => toggleTarget(target)}>
                    {selected ? <Check size={17} /> : <Lock size={17} />} {target}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grown-up-actions">
            <button className="make-button" type="button" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={19} /> {isGenerating ? 'Making Quest...' : 'Make New Quest'}
            </button>
            <button className="access-button" type="button" onClick={handleRequestAccess}>
              <ShieldCheck size={19} /> Allow Device Access
            </button>
          </div>
          <p className="device-note">Device control: {status?.supported ? status.status : 'phone app required'}</p>
        </div>
      </details>
    </main>
  );
}

export default App;
