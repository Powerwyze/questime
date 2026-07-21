package com.questime.app;

import android.app.AppOpsManager;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenTime")
public class ScreenTimePlugin extends Plugin {
    @PluginMethod
    public void getAuthorizationStatus(PluginCall call) {
        boolean granted = hasUsageAccess();
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("supported", true);
        result.put("status", granted ? "authorized" : "unknown");
        result.put("detail", granted ? "Usage access is enabled." : "Usage access has not been granted yet.");
        call.resolve(result);
    }

    @PluginMethod
    public void requestAuthorization(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("supported", true);
        result.put("status", "prompted");
        result.put("detail", "Opened Android usage access settings.");
        call.resolve(result);
    }

    @PluginMethod
    public void applyPlan(PluginCall call) {
        JSObject result = new JSObject();
        result.put("applied", false);
        result.put("status", hasUsageAccess() ? "authorized" : "unknown");
        result.put("detail", "Android usage tracking is wired. Hard blocking needs Device Owner lock task mode or an Accessibility-based blocker.");
        call.resolve(result);
    }

    private boolean hasUsageAccess() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                getContext().getPackageName()
        );

        if (mode == AppOpsManager.MODE_ALLOWED) {
            UsageStatsManager usageStats = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
            long now = System.currentTimeMillis();
            return usageStats.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 1000 * 60, now) != null;
        }

        return false;
    }
}
