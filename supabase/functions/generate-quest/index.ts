import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type ScreenTimeMode = 'focus' | 'reward' | 'bedtime';

interface QuestRequest {
  childName?: string;
  mode?: ScreenTimeMode;
  blockedTargets?: string[];
  dailyBudgetMinutes?: number;
  rewardUnlockMinutes?: number;
  goal?: string;
}

interface QuestPlan {
  title: string;
  summary: string;
  steps: Array<{
    title: string;
    minutes: number;
    reward: string;
  }>;
  parentNudge: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const fallbackPlan = (request: Required<QuestRequest>): QuestPlan => ({
  title: `${request.childName}'s ${request.mode === 'bedtime' ? 'Wind Down' : 'Focus'} Quest`,
  summary: `Finish ${request.goal} before opening a ${request.rewardUnlockMinutes} minute reward window.`,
  steps: [
    {
      title: 'Choose the first visible task',
      minutes: 5,
      reward: 'Quest active',
    },
    {
      title: request.goal,
      minutes: Math.max(10, Math.min(35, request.dailyBudgetMinutes - request.rewardUnlockMinutes)),
      reward: 'Unlock token ready',
    },
    {
      title: 'Show proof and reset',
      minutes: 3,
      reward: `${request.rewardUnlockMinutes} minutes restored`,
    },
  ],
  parentNudge: `Keep ${request.blockedTargets.slice(0, 2).join(' and ') || 'distractions'} shielded until the proof step is done.`,
});

const normalizeRequest = (body: QuestRequest): Required<QuestRequest> => {
  const childName = String(body.childName || 'Maya').slice(0, 40);
  const goal = String(body.goal || 'finish one useful task').slice(0, 120);
  const mode = body.mode === 'reward' || body.mode === 'bedtime' ? body.mode : 'focus';
  const dailyBudgetMinutes = clamp(Number(body.dailyBudgetMinutes || 90), 30, 180);
  const rewardUnlockMinutes = clamp(Number(body.rewardUnlockMinutes || 15), 5, 45);
  const blockedTargets = Array.isArray(body.blockedTargets)
    ? body.blockedTargets.map((target) => String(target).slice(0, 40)).slice(0, 8)
    : ['Games', 'Short video'];

  return {
    childName,
    goal,
    mode,
    dailyBudgetMinutes,
    rewardUnlockMinutes,
    blockedTargets,
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const extractOutputText = (data: Record<string, unknown>) => {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || !('content' in item)) {
        return [];
      }

      const content = Array.isArray(item.content) ? item.content : [];
      return content.map((part: unknown) => {
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      });
    })
    .join('');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500, headers: corsHeaders });
  }

  let request: Required<QuestRequest>;

  try {
    request = normalizeRequest(await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const instructions = [
    'Create a practical screen-time quest plan for a family productivity app.',
    'Return only compact JSON with this exact shape:',
    '{"title":"string","summary":"string","steps":[{"title":"string","minutes":number,"reward":"string"}],"parentNudge":"string"}',
    'Use encouraging language. Keep steps concrete and short.',
  ].join(' ');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-5.6',
      reasoning: { effort: 'low' },
      instructions,
      input: JSON.stringify(request),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json(
      { error: 'OpenAI request failed', detail: detail.slice(0, 500) },
      { status: 502, headers: corsHeaders },
    );
  }

  const data = await response.json();
  const outputText = extractOutputText(data);

  try {
    const plan = JSON.parse(outputText) as QuestPlan;
    return Response.json({ plan }, { headers: corsHeaders });
  } catch {
    return Response.json({ plan: fallbackPlan(request) }, { headers: corsHeaders });
  }
});
