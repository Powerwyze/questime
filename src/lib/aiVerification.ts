import { createClient } from '@supabase/supabase-js';

export interface VerifyTaskProofRequest {
  taskTitle: string;
  taskDescription: string;
  completedState: string;
  childNotes: string;
  proofImageDataUrl?: string;
}

export interface VerifyTaskProofResult {
  verified: boolean;
  stars: number;
  confidence: number;
  feedback: string;
  source: 'ai' | 'local-fallback';
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function localFallback(request: VerifyTaskProofRequest): VerifyTaskProofResult {
  const hasImage = Boolean(request.proofImageDataUrl?.startsWith('data:image/'));
  const noteWords = request.childNotes.trim().split(/\s+/).filter(Boolean).length;
  const hasSpecificTask = request.taskTitle.trim().length > 3 && request.completedState.trim().length > 6;

  let stars = 1;
  if (hasImage) stars += 2;
  if (noteWords >= 4) stars += 1;
  if (hasSpecificTask) stars += 1;
  stars = clamp(stars, 1, 5);

  const verified = hasImage && stars >= 4;
  return {
    verified,
    stars,
    confidence: verified ? 0.78 : 0.42,
    source: 'local-fallback',
    feedback: verified
      ? `Proof received for “${request.taskTitle}.” This test build used local AI-style checks because no verification backend is configured. The photo and notes look complete enough to unlock the reward.`
      : 'I need a clear photo proof plus a short note about what was finished before I can verify this task.',
  };
}

function normalizeVerification(data: unknown, request: VerifyTaskProofRequest): VerifyTaskProofResult {
  if (!data || typeof data !== 'object') return localFallback(request);
  const value = data as Record<string, unknown>;
  const starsRaw = value.stars;
  const confidenceRaw = value.confidence;
  const stars = clamp(
    typeof starsRaw === 'number' ? Math.round(starsRaw) : Number.parseInt(String(starsRaw ?? '3'), 10) || 3,
    1,
    5,
  );
  const confidence = clamp(
    typeof confidenceRaw === 'number' ? confidenceRaw : Number.parseFloat(String(confidenceRaw ?? '0.7')) || 0.7,
    0,
    1,
  );
  const verified = Boolean(value.verified ?? stars >= 4);
  return {
    verified,
    stars,
    confidence,
    source: 'ai',
    feedback: String(value.feedback ?? (verified ? 'Task verified. Reward unlocked.' : 'Task needs another proof photo.')),
  };
}

export async function verifyTaskProof(request: VerifyTaskProofRequest): Promise<VerifyTaskProofResult> {
  if (!request.proofImageDataUrl) {
    return {
      verified: false,
      stars: 1,
      confidence: 0,
      source: supabaseUrl && supabaseAnonKey ? 'ai' : 'local-fallback',
      feedback: 'Add a photo of the completed task before asking AI to verify it.',
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    return localFallback(request);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.functions.invoke('verify-quest-proof', {
      body: request,
    });

    if (error) throw new Error(error.message);
    return normalizeVerification(data, request);
  } catch (error) {
    console.warn('[Questime] AI verification failed; using local fallback.', error);
    return localFallback(request);
  }
}
