import { createClient } from '@supabase/supabase-js';
import type { ScreenTimeMode } from '../native/screenTime';

export interface QuestPlanRequest {
  childName: string;
  mode: ScreenTimeMode;
  blockedTargets: string[];
  dailyBudgetMinutes: number;
  rewardUnlockMinutes: number;
  goal: string;
}

export interface QuestStep {
  title: string;
  minutes: number;
  reward: string;
}

export interface QuestPlan {
  title: string;
  summary: string;
  steps: QuestStep[];
  parentNudge: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const localPlan = (request: QuestPlanRequest): QuestPlan => {
  const firstTarget = request.blockedTargets[0] ?? 'favorite apps';
  const totalQuestMinutes = Math.max(15, Math.min(60, request.dailyBudgetMinutes / 2));

  return {
    title: `${request.childName}'s Focus Quest`,
    summary: `Trade ${totalQuestMinutes} minutes of offline progress for ${request.rewardUnlockMinutes} minutes back with ${firstTarget}.`,
    steps: [
      {
        title: 'Start the timer',
        minutes: 5,
        reward: 'Mark the quest active and silence the blocked list.',
      },
      {
        title: request.goal || 'Finish one useful task',
        minutes: Math.max(10, Math.round(totalQuestMinutes * 0.65)),
        reward: 'Bank the first unlock token.',
      },
      {
        title: 'Quick reflection',
        minutes: 3,
        reward: `${request.rewardUnlockMinutes} minutes of reward screen time.`,
      },
    ],
    parentNudge: 'Preview mode is using a local plan. Add Supabase URL and anon key to call the Edge Function.',
  };
};

export async function generateQuestPlan(request: QuestPlanRequest): Promise<QuestPlan> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return localPlan(request);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.functions.invoke<{ plan: QuestPlan }>('generate-quest', {
    body: request,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.plan) {
    throw new Error('The quest service returned an empty plan.');
  }

  return data.plan;
}
