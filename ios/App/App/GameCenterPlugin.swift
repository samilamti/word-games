import Foundation
import Capacitor
import GameKit

/**
 * Minimal Capacitor plugin exposing GKLocalPlayer authentication to the
 * Lexica Knights web layer. Wraps GameKit's `authenticateHandler`, presents
 * the system sign-in sheet if needed, and resolves with the player's alias
 * (or `isAuthenticated: false` when the user declined or isn't signed into
 * Game Center on this device).
 *
 * Registered automatically via Capacitor 8's runtime plugin discovery —
 * any class implementing CAPBridgedPlugin in the App target is picked up.
 */
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLocalPlayer", returnType: CAPPluginReturnPromise),
    ]

    /// Triggers Game Center authentication. Apple's API may invoke the
    /// completion closure once with a UIViewController to present (if the
    /// user needs to sign in), and again later with the result. We resolve
    /// the JS call only when we have a terminal state.
    @objc func authenticate(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        var resolved = false

        player.authenticateHandler = { [weak self] viewController, error in
            DispatchQueue.main.async {
                if let viewController = viewController {
                    // Present the sign-in sheet rooted at the Capacitor bridge VC.
                    self?.bridge?.viewController?.present(viewController, animated: true, completion: nil)
                    return
                }

                guard !resolved else { return }
                resolved = true

                if player.isAuthenticated {
                    call.resolve([
                        "isAuthenticated": true,
                        "alias": player.alias,
                        "displayName": player.displayName.isEmpty ? player.alias : player.displayName,
                        "playerID": player.gamePlayerID,
                    ])
                } else if let error = error {
                    call.resolve([
                        "isAuthenticated": false,
                        "error": error.localizedDescription,
                    ])
                } else {
                    call.resolve([
                        "isAuthenticated": false,
                    ])
                }
            }
        }
    }

    /// Synchronous-ish read of the current local player. Doesn't trigger
    /// authentication — use `authenticate` for that.
    @objc func getLocalPlayer(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        if player.isAuthenticated {
            call.resolve([
                "isAuthenticated": true,
                "alias": player.alias,
                "displayName": player.displayName.isEmpty ? player.alias : player.displayName,
                "playerID": player.gamePlayerID,
            ])
        } else {
            call.resolve(["isAuthenticated": false])
        }
    }
}
