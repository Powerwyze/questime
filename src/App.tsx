import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Bot, Camera, Check, Clock3, Gift, Home, ImagePlus, Lock, Play, RotateCcw, ShieldCheck, Sparkles, Star, Trophy, UserRound, XCircle } from 'lucide-react';
import { applyScreenTimePlan, getScreenTimeStatus, requestScreenTimeAccess } from './native/screenTime';
import type { ScreenTimeStatus } from './native/screenTime';
import { generateQuestPlan } from './lib/questPlanner';
import type { QuestPlan } from './lib/questPlanner';
import { verifyTaskProof } from './lib/aiVerification';
import type { VerifyTaskProofResult } from './lib/aiVerification';

const targetOptions = ['Games', 'Short video', 'Social apps', 'Streaming', 'Shopping', 'Web browsing'];
const storageKey = 'questime-parent-child-ai-state-v1';

type ViewMode = 'child' | 'parent';
type QuestStatus = 'assigned' | 'active' | 'ready-proof' | 'verifying' | 'verified' | 'needs-redo' | 'reward-active';

interface QuestimeState {
  childName: string;
  taskTitle: string;
  taskDescription: string;
  completedState: string;
  dailyBudgetMinutes: number;
  rewardUnlockMinutes: number;
  selectedTargets: string[];
  questPlan: QuestPlan;
  questStatus: QuestStatus;
  completedSteps: number[];
  childNotes: string;
  proofImageDataUrl?: string;
  verification?: VerifyTaskProofResult;
  rewardBankMinutes: number;
  parentPin: string;
  assignedAt?: string;
  verifiedAt?: string;
}

const initialPlan: QuestPlan = {
  title: 'Clean your room',
  summary: 'Finish the assigned task, upload a proof photo, then Questime AI checks it before play time unlocks.',
  steps: [
    { title: 'Read what needs to be done', minutes: 2, reward: 'Know the target' },
    { title: 'Do the task', minutes: 25, reward: 'Get ready for proof' },
    { title: 'Take a photo of the finished work', minutes: 3, reward: 'AI can verify it' },
  ],
  parentNudge: 'Set a clear completed-state rule. The child needs a proof image before reward time unlocks.',
};

const defaultState: QuestimeState = {
  childName: 'Maya',
  taskTitle: 'Clean your room',
  taskDescription: 'Put clothes in the hamper, clear the floor, and make the bed.',
  completedState: 'The floor is clear, bed is made, and toys/clothes are put away.',
  dailyBudgetMinutes: 120,
  rewardUnlockMinutes: 60,
  selectedTargets: ['Games', 'Short video', 'Social apps'],
  questPlan: initialPlan,
  questStatus: 'assigned',
  completedSteps: [],
  childNotes: '',
  rewardBankMinutes: 0,
  parentPin: '1234',
};

const statusCopy: Record<QuestStatus, string> = {
  assigned: 'Task assigned',
  active: 'Task in progress',
  'ready-proof': 'Ready for proof photo',
  verifying: 'AI is checking proof',
  verified: 'AI verified task',
  'needs-redo': 'Needs another try',
  'reward-active': 'Screen time is unlocked',
};

const formatReward = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr${hours === 1 ? '' : 's'}`;
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

const readImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('child');
  const [state, setState] = useState<QuestimeState>(loadState);
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('Parent can assign a task. Child completes it with photo proof.');
  const [pinEntry, setPinEntry] = useState('');
  const [parentUnlocked, setParentUnlocked] = useState(false);

  const progressPercent = useMemo(() => Math.round((state.completedSteps.length / Math.max(1, state.questPlan.steps.length)) * 100), [state.completedSteps.length, state.questPlan.steps.length]);
  const selectedTargetCopy = state.selectedTargets.length ? state.selectedTargets.join(', ') : 'No apps selected';
  const proofReady = Boolean(state.proofImageDataUrl);
  const canVerify = proofReady && state.questStatus !== 'verifying';

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

  const assignTask = async () => {
    setIsGenerating(true);
    setMessage('Building the child task card...');
    try {
      const plan = await generateQuestPlan({
        childName: state.childName,
        goal: state.taskTitle,
        mode: 'focus',
        dailyBudgetMinutes: state.dailyBudgetMinutes,
        rewardUnlockMinutes: state.rewardUnlockMinutes,
        blockedTargets: state.selectedTargets,
      });
      updateState({
        questPlan: {
          ...plan,
          title: state.taskTitle,
          summary: `${state.taskDescription} Proof rule: ${state.completedState}`,
          parentNudge: `AI should verify the photo against: ${state.completedState}`,
        },
        questStatus: 'assigned',
        completedSteps: [],
        childNotes: '',
        proofImageDataUrl: undefined,
        verification: undefined,
        rewardBankMinutes: 0,
        assignedAt: new Date().toLocaleString(),
        verifiedAt: undefined,
      });
      setViewMode('child');
      setMessage(`${state.childName}'s task is assigned with ${formatReward(state.rewardUnlockMinutes)} of screen time attached.`);
    } catch {
      updateState({
        questPlan: {
          ...initialPlan,
          title: state.taskTitle,
          summary: `${state.taskDescription} Proof rule: ${state.completedState}`,
          steps: [
            { title: 'Read the task', minutes: 2, reward: 'Know what counts as done' },
            { title: state.taskTitle, minutes: 25, reward: 'Task finished' },
            { title: 'Take a proof photo', minutes: 3, reward: `${formatReward(state.rewardUnlockMinutes)} unlock after AI check` },
          ],
          parentNudge: 'Fallback plan used. The AI verifier still checks the proof image when configured.',
        },
        questStatus: 'assigned',
        completedSteps: [],
        childNotes: '',
        proofImageDataUrl: undefined,
        verification: undefined,
        rewardBankMinutes: 0,
        assignedAt: new Date().toLocaleString(),
        verifiedAt: undefined,
      });
      setViewMode('child');
      setMessage('Task assigned using the local planner.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestAccess = async () => {
    const nextStatus = await requestScreenTimeAccess();
    setStatus(nextStatus);
    setMessage(nextStatus.supported ? 'Device access screen opened.' : 'Open this app on Android to allow access.');
  };

  const handleStartTask = async () => {
    const result = await applyScreenTimePlan({
      mode: 'focus',
      blockedTargets: state.selectedTargets,
      dailyBudgetMinutes: state.dailyBudgetMinutes,
      rewardUnlockMinutes: state.rewardUnlockMinutes,
    });
    updateState({ questStatus: 'active', completedSteps: [] });
    setMessage(result.detail || 'Task started. Screen-time reward is locked until AI verification passes.');
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
        questStatus: allDone ? 'ready-proof' : 'active',
      };
    });
    setMessage('Progress saved. Add a proof photo when the task is done.');
  };

  const handleProofImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please choose a photo image.');
      return;
    }
    try {
      const dataUrl = await readImage(file);
      updateState({ proofImageDataUrl: dataUrl, questStatus: 'ready-proof', verification: undefined });
      setMessage('Proof photo added. Tap AI Verify to check it.');
    } catch {
      setMessage('Could not read that image. Try another photo.');
    } finally {
      event.target.value = '';
    }
  };

  const runAiVerification = async () => {
    if (!state.proofImageDataUrl) {
      setMessage('Add a proof photo first.');
      return;
    }
    setIsVerifying(true);
    updateState({ questStatus: 'verifying' });
    setMessage('AI is comparing the photo to the parent’s done rule...');
    const result = await verifyTaskProof({
      taskTitle: state.taskTitle,
      taskDescription: state.taskDescription,
      completedState: state.completedState,
      childNotes: state.childNotes,
      proofImageDataUrl: state.proofImageDataUrl,
    });

    if (result.verified) {
      const applyResult = await applyScreenTimePlan({
        mode: 'reward',
        blockedTargets: state.selectedTargets,
        dailyBudgetMinutes: state.dailyBudgetMinutes,
        rewardUnlockMinutes: state.rewardUnlockMinutes,
      });
      updateState({
        verification: result,
        questStatus: 'verified',
        rewardBankMinutes: state.rewardUnlockMinutes,
        verifiedAt: new Date().toLocaleString(),
      });
      setMessage(applyResult.applied ? 'AI verified it. Screen time unlocked.' : 'AI verified it. Reward is ready in this test build.');
    } else {
      updateState({ verification: result, questStatus: 'needs-redo' });
      setMessage('AI needs clearer proof before unlocking screen time.');
    }
    setIsVerifying(false);
  };

  const startReward = () => {
    updateState({ questStatus: 'reward-active' });
    setMessage(`${formatReward(state.rewardUnlockMinutes)} of screen time started.`);
  };

  const parentOverrideApprove = () => {
    updateState({
      questStatus: 'verified',
      rewardBankMinutes: state.rewardUnlockMinutes,
      verification: state.verification ?? {
        verified: true,
        stars: 5,
        confidence: 1,
        source: 'local-fallback',
        feedback: 'Parent manually approved this task.',
      },
      verifiedAt: new Date().toLocaleString(),
    });
    setMessage('Parent override approved the reward.');
  };

  const resetTask = () => {
    updateState({ questStatus: 'assigned', completedSteps: [], childNotes: '', proofImageDataUrl: undefined, verification: undefined, rewardBankMinutes: 0, verifiedAt: undefined });
    setMessage('Task reset. Child can try again.');
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
          <span>{viewMode === 'child' ? 'Child task app' : 'Parent assignment app'}</span>
        </div>
        <div className="reward-pill"><Star size={18} fill="currentColor" /> {formatReward(state.rewardBankMinutes || state.rewardUnlockMinutes)}</div>
      </header>

      <nav className="mode-tabs" aria-label="Switch test mode">
        <button className={viewMode === 'child' ? 'active' : ''} type="button" onClick={() => setViewMode('child')}><UserRound size={18} /> Child</button>
        <button className={viewMode === 'parent' ? 'active' : ''} type="button" onClick={() => setViewMode('parent')}><ShieldCheck size={18} /> Parent</button>
      </nav>

      {viewMode === 'child' ? (
        <section className="quest-card child-card" aria-labelledby="quest-title">
          <p className="hello">Hi {state.childName}!</p>
          <h1 id="quest-title">Your task is:</h1>
          <div className="goal-banner">{state.taskTitle}</div>
          <p className="summary-copy">{state.taskDescription}</p>
          <div className="done-rule"><Bot size={19} /><span>AI checks the photo for:</span><strong>{state.completedState}</strong></div>

          <div className={`quest-state ${state.questStatus}`}>
            <strong>{statusCopy[state.questStatus]}</strong>
            <span>{progressPercent}% complete • Reward: {formatReward(state.rewardUnlockMinutes)} screen time</span>
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

          {state.questStatus === 'assigned' ? (
            <button className="start-button" type="button" onClick={handleStartTask}>
              <Play size={25} fill="currentColor" /> Start Task
            </button>
          ) : state.questStatus === 'verified' ? (
            <button className="start-button reward-cta" type="button" onClick={startReward}>
              <Gift size={25} /> Start {formatReward(state.rewardUnlockMinutes)} Screen Time
            </button>
          ) : state.questStatus === 'reward-active' ? (
            <button className="start-button reward-cta" type="button" onClick={resetTask}>
              <RotateCcw size={25} /> Done Playing — Reset
            </button>
          ) : state.questStatus !== 'verifying' ? (
            <button className="start-button" type="button" onClick={() => toggleStep(Math.min(state.completedSteps.length, state.questPlan.steps.length - 1))}>
              <Check size={25} /> Mark Next Step Done
            </button>
          ) : null}

          <section className="proof-card" aria-label="Proof and AI verification">
            <div className="proof-header">
              <div><strong>Proof photo</strong><span>Take or upload a picture after the task is done.</span></div>
              <Camera size={24} />
            </div>
            {state.proofImageDataUrl ? <img className="proof-image" src={state.proofImageDataUrl} alt="Child proof upload" /> : <div className="proof-empty"><ImagePlus size={34} /> No proof photo yet</div>}
            <label className="photo-button">
              <ImagePlus size={20} /> Add proof photo
              <input accept="image/*" capture="environment" type="file" onChange={handleProofImage} />
            </label>
            <label className="field notes-field"><span>What did you finish?</span><textarea value={state.childNotes} onChange={(event) => updateState({ childNotes: event.target.value })} placeholder="I made my bed and put my clothes away." /></label>
            <button className="verify-button" type="button" onClick={runAiVerification} disabled={!canVerify || isVerifying}>
              <Bot size={20} /> {isVerifying ? 'AI checking...' : 'AI Verify Task'}
            </button>
          </section>

          {state.verification ? (
            <div className={`verification-card ${state.verification.verified ? 'pass' : 'fail'}`}>
              {state.verification.verified ? <Trophy size={26} /> : <XCircle size={26} />}
              <div>
                <strong>{state.verification.verified ? 'Verified' : 'Needs redo'} • {state.verification.stars}/5 stars</strong>
                <p>{state.verification.feedback}</p>
                <span>{state.verification.source === 'ai' ? 'AI backend' : 'Local test verifier'} • confidence {Math.round(state.verification.confidence * 100)}%</span>
              </div>
            </div>
          ) : null}

          <p className="status-message" aria-live="polite">{message}</p>
        </section>
      ) : (
        <section className="quest-card parent-card" aria-labelledby="parent-title">
          <p className="hello">Grown-up dashboard</p>
          <h1 id="parent-title">Assign task + screen time</h1>

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
                <div><span>AI Score</span><strong>{state.verification ? `${state.verification.stars}/5` : '—'}</strong></div>
                <div><span>Reward</span><strong>{formatReward(state.rewardUnlockMinutes)}</strong></div>
              </div>

              <label className="field"><span>Child's name</span><input value={state.childName} onChange={(event) => updateState({ childName: event.target.value })} /></label>
              <label className="field"><span>Task title</span><input value={state.taskTitle} onChange={(event) => updateState({ taskTitle: event.target.value })} placeholder="Clean your room" /></label>
              <label className="field"><span>Task instructions</span><textarea value={state.taskDescription} onChange={(event) => updateState({ taskDescription: event.target.value })} placeholder="What should the child do?" /></label>
              <label className="field"><span>AI verification rule</span><textarea value={state.completedState} onChange={(event) => updateState({ completedState: event.target.value })} placeholder="How should the proof photo look when done?" /></label>

              <div className="time-grid">
                <label className="field"><span>Screen-time reward</span><select value={state.rewardUnlockMinutes} onChange={(event) => updateState({ rewardUnlockMinutes: Number(event.target.value) })}><option value="30">0.5 hour</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option></select></label>
                <label className="field"><span>Daily max screen time</span><select value={state.dailyBudgetMinutes} onChange={(event) => updateState({ dailyBudgetMinutes: Number(event.target.value) })}><option value="60">1 hour</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option></select></label>
              </div>

              <fieldset>
                <legend>Apps/categories controlled by reward</legend>
                <div className="target-grid">
                  {targetOptions.map((target) => {
                    const selected = state.selectedTargets.includes(target);
                    return <button className={selected ? 'target selected' : 'target'} key={target} type="button" onClick={() => toggleTarget(target)}>{selected ? <Check size={17} /> : <Lock size={17} />} {target}</button>;
                  })}
                </div>
                <p className="device-note">Selected: {selectedTargetCopy}</p>
              </fieldset>

              {state.proofImageDataUrl ? (
                <div className="parent-proof-review">
                  <strong>Latest child proof</strong>
                  <img src={state.proofImageDataUrl} alt="Latest child proof" />
                  <p>{state.verification?.feedback ?? 'Waiting for AI verification.'}</p>
                </div>
              ) : null}

              <div className="grown-up-actions">
                <button className="make-button" type="button" onClick={assignTask} disabled={isGenerating}><Sparkles size={19} /> {isGenerating ? 'Assigning...' : 'Assign Task'}</button>
                <button className="access-button" type="button" onClick={handleRequestAccess}><ShieldCheck size={19} /> Device Access</button>
                <button className="approve-button" type="button" onClick={parentOverrideApprove}><Gift size={19} /> Parent Approve</button>
                <button className="reset-button" type="button" onClick={resetTask}><RotateCcw size={19} /> Reset Task</button>
              </div>

              <label className="field"><span>Parent PIN</span><input inputMode="numeric" value={state.parentPin} onChange={(event) => updateState({ parentPin: event.target.value })} /></label>
              <p className="device-note">Device control: {status?.supported ? status.status : 'phone app required'}{state.assignedAt ? ` • Assigned: ${state.assignedAt}` : ''}{state.verifiedAt ? ` • Verified: ${state.verifiedAt}` : ''}</p>
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
