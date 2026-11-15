import ExpoModulesCore
import ImageIO
import UIKit
import Vision

public final class TailnumberOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TailnumberOcr")
    AsyncFunction("recognize") { (uri: String) -> [String] in
      guard let url = URL(string: uri), url.isFileURL,
            let image = UIImage(contentsOfFile: url.path), let cgImage = image.cgImage else {
        throw NSError(domain: "TailnumberOcr", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Choose a local camera image."])
      }
      let orientation: CGImagePropertyOrientation
      switch image.imageOrientation {
      case .up: orientation = .up
      case .down: orientation = .down
      case .left: orientation = .left
      case .right: orientation = .right
      case .upMirrored: orientation = .upMirrored
      case .downMirrored: orientation = .downMirrored
      case .leftMirrored: orientation = .leftMirrored
      case .rightMirrored: orientation = .rightMirrored
      @unknown default: orientation = .up
      }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false // Registrations are identifiers, not words.
      request.recognitionLanguages = ["en-US"]
      try VNImageRequestHandler(cgImage: cgImage, orientation: orientation).perform([request])
      return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    }
  }
}
