import ExpoModulesCore
import UIKit

public final class NoorIconsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NoorIcons")

    AsyncFunction("getIcon") { () -> [String: Any] in
      let app = UIApplication.shared
      return ["supported": app.supportsAlternateIcons, "name": app.alternateIconName ?? ""]
    }.runOnQueue(.main)

    AsyncFunction("setIcon") { (name: String, promise: Promise) in
      UIApplication.shared.setAlternateIconName(name.isEmpty ? nil : name) { error in
        if let error {
          promise.reject("ERR_NOOR_ICON", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }.runOnQueue(.main)
  }
}
