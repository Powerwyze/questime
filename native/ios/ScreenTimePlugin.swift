import Capacitor
import Foundation

#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
#endif

@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenTimePlugin"
    public let jsName = "ScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAuthorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "applyPlan", returnType: CAPPluginReturnPromise)
    ]

    @objc func getAuthorizationStatus(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            call.resolve([
                "platform": "ios",
                "supported": true,
                "status": statusString(AuthorizationCenter.shared.authorizationStatus),
                "detail": "FamilyControls is available. App/category selection still needs a FamilyActivityPicker flow."
            ])
            return
        }
        #endif

        call.resolve([
            "platform": "ios",
            "supported": false,
            "status": "unsupported",
            "detail": "Screen Time APIs require FamilyControls support and the Apple entitlement."
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    call.resolve([
                        "platform": "ios",
                        "supported": true,
                        "status": self.statusString(AuthorizationCenter.shared.authorizationStatus),
                        "detail": "Screen Time authorization request completed."
                    ])
                } catch {
                    call.resolve([
                        "platform": "ios",
                        "supported": true,
                        "status": "denied",
                        "detail": error.localizedDescription
                    ])
                }
            }
            return
        }
        #endif

        call.resolve([
            "platform": "ios",
            "supported": false,
            "status": "unsupported",
            "detail": "FamilyControls is not available in this build."
        ])
    }

    @objc func applyPlan(_ call: CAPPluginCall) {
        call.resolve([
            "applied": false,
            "status": "prompted",
            "detail": "iOS enforcement requires a FamilyActivityPicker selection, then ManagedSettings shielding."
        ])
    }

    #if canImport(FamilyControls)
    @available(iOS 16.0, *)
    private func statusString(_ status: AuthorizationStatus) -> String {
        switch status {
        case .approved:
            return "authorized"
        case .denied:
            return "denied"
        case .notDetermined:
            return "unknown"
        @unknown default:
            return "unknown"
        }
    }
    #endif
}
