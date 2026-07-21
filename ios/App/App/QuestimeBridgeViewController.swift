import Capacitor
import UIKit

class QuestimeBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ScreenTimePlugin())
    }
}
