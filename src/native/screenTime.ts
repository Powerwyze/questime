import { Capacitor, registerPlugin } from '@capacitor/core';

export type AuthorizationStatus = 'authorized' | 'denied' | 'prompted' | 'unsupported' | 'unknown';

export type ScreenTimeMode = 'focus' | 'reward' | 'bedtime';

export interface ScreenTimePlan {
  mode: ScreenTimeMode;
  blockedTargets: string[];
  dailyBudgetMinutes: number;
  rewardUnlockMinutes: number;
}

export interface ScreenTimeStatus {
  platform: string;
  supported: boolean;
  status: AuthorizationStatus;
  detail: string;
}

export interface ScreenTimeApplyResult {
  applied: boolean;
  status: AuthorizationStatus;
  detail: string;
}

interface ScreenTimePlugin {
  getAuthorizationStatus(): Promise<ScreenTimeStatus>;
  requestAuthorization(): Promise<ScreenTimeStatus>;
  applyPlan(plan: ScreenTimePlan): Promise<ScreenTimeApplyResult>;
}

const NativeScreenTime = registerPlugin<ScreenTimePlugin>('ScreenTime');

const webStatus = (): ScreenTimeStatus => ({
  platform: 'web',
  supported: false,
  status: 'unsupported',
  detail: 'Device-wide limits require the installed iOS or Android app.',
});

export async function getScreenTimeStatus(): Promise<ScreenTimeStatus> {
  if (!Capacitor.isNativePlatform()) {
    return webStatus();
  }

  try {
    return await NativeScreenTime.getAuthorizationStatus();
  } catch {
    return {
      platform: Capacitor.getPlatform(),
      supported: false,
      status: 'unknown',
      detail: 'The native ScreenTime plugin has not been registered yet.',
    };
  }
}

export async function requestScreenTimeAccess(): Promise<ScreenTimeStatus> {
  if (!Capacitor.isNativePlatform()) {
    return webStatus();
  }

  try {
    return await NativeScreenTime.requestAuthorization();
  } catch {
    return {
      platform: Capacitor.getPlatform(),
      supported: false,
      status: 'unknown',
      detail: 'Native authorization is waiting on the platform plugin.',
    };
  }
}

export async function applyScreenTimePlan(plan: ScreenTimePlan): Promise<ScreenTimeApplyResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      applied: false,
      status: 'unsupported',
      detail: `Web preview queued ${plan.blockedTargets.length} targets, but cannot enforce device limits.`,
    };
  }

  try {
    return await NativeScreenTime.applyPlan(plan);
  } catch {
    return {
      applied: false,
      status: 'unknown',
      detail: 'The native ScreenTime plugin has not been registered yet.',
    };
  }
}
