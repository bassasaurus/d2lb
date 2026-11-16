import ExpoModulesCore
import ImageIO
import UIKit
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins

public final class TailnumberOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TailnumberOcr")
    AsyncFunction("recognizeEnhanced") { (uri: String, corners: [[Double]]) -> [[String]] in
      guard let url = URL(string: uri), url.isFileURL,
            let loaded = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else {
        throw NSError(domain: "TailnumberOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Choose a local camera image."])
      }
      let normalized = loaded.transformed(by: CGAffineTransform(translationX: -loaded.extent.minX, y: -loaded.extent.minY))
      let size = normalized.extent.size
      let factor = min(1, 1800 / max(size.width, size.height))
      let bounded = normalized.transformed(by: CGAffineTransform(scaleX: factor, y: factor))
      let selected = corners.isEmpty ? bounded : try Self.rectify(bounded, corners: corners)
      let context = CIContext(options: [.cacheIntermediates: false])
      let deadline = Date().addingTimeInterval(14)
      var passes: [[String]] = []
      func recognize(_ image: CIImage) throws -> [VNRecognizedTextObservation] {
        guard let cg = context.createCGImage(image, from: image.extent) else { return [] }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en-US"]
        try VNImageRequestHandler(cgImage: cg).perform([request])
        return request.results ?? []
      }
      func strings(_ observations: [VNRecognizedTextObservation]) -> [String] {
        observations.compactMap { $0.topCandidates(1).first?.string }
      }
      let original = Self.padded(selected)
      let first = try recognize(original)
      passes.append(strings(first))
      let lighting = original.applyingFilter("CIColorControls", parameters: ["inputSaturation": 0, "inputContrast": 1.3])
        .applyingFilter("CIHighlightShadowAdjust", parameters: ["inputShadowAmount": 0.6, "inputHighlightAmount": 0.9])
      passes.append(strings(try recognize(lighting)))
      for observation in first.sorted(by: { $0.boundingBox.width * $0.boundingBox.height > $1.boundingBox.width * $1.boundingBox.height }).prefix(4) {
        if Date() > deadline.addingTimeInterval(-2) { break }
        guard let text = observation.topCandidates(1).first?.string, text.count >= 3, text.count <= 18,
              text.contains(where: { $0.isNumber || $0 == "-" }) else { continue }
        let points = [observation.topLeft, observation.topRight, observation.bottomRight, observation.bottomLeft]
        let cx = points.map(\.x).reduce(0, +) / 4
        let cy = points.map(\.y).reduce(0, +) / 4
        let quad = points.map { p in [Double(min(1, max(0, cx + (p.x - cx) * 1.18))), Double(1 - min(1, max(0, cy + (p.y - cy) * 1.3)))] }
        if let corrected = try? Self.rectify(original, corners: quad) { passes.append(strings(try recognize(corrected))) }
      }
      // Keep the original pass. Mild low-pass filtering reduces LCD pixel-grid
      // detail; aggressive sharpening and binarization are deliberately avoided.
      if Date() < deadline.addingTimeInterval(-2) {
        let lcd = original.clampedToExtent().applyingFilter("CIGaussianBlur", parameters: ["inputRadius": 0.65]).cropped(to: original.extent)
        passes.append(strings(try recognize(lcd)))
      }
      for degrees in [-15.0, 15.0, -30.0, 30.0, 180.0] {
        if Date() > deadline.addingTimeInterval(-2) { break }
        let rotated = selected.transformed(by: CGAffineTransform(rotationAngle: degrees * .pi / 180))
        passes.append(strings(try recognize(Self.padded(rotated))))
      }
      return passes
    }
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
  private static func padded(_ image: CIImage) -> CIImage {
    let scale = min(3, 1200 / max(image.extent.width, image.extent.height))
    let sized = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let shifted = sized.transformed(by: CGAffineTransform(translationX: 32 - sized.extent.minX, y: 32 - sized.extent.minY))
    let rect = CGRect(x: 0, y: 0, width: shifted.extent.width + 64, height: shifted.extent.height + 64)
    return shifted.composited(over: CIImage(color: .white).cropped(to: rect)).cropped(to: rect)
  }
  private static func rectify(_ image: CIImage, corners: [[Double]]) throws -> CIImage {
    func invalid() -> NSError { NSError(domain: "TailnumberOcr", code: 2, userInfo: [NSLocalizedDescriptionKey: "Adjust the crop corners."]) }
    guard corners.count == 4, corners.allSatisfy({ $0.count == 2 && $0.allSatisfy({ $0.isFinite && $0 >= 0 && $0 <= 1 }) }) else { throw invalid() }
    var area = 0.0
    for i in 0..<4 {
      let a = corners[i], b = corners[(i+1)%4], c = corners[(i+2)%4]
      guard (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]) > 0 else { throw invalid() }
      area += a[0]*b[1]-b[0]*a[1]
    }
    guard area > 0.01 else { throw invalid() }
    let points = corners.map { CIVector(x: image.extent.minX + $0[0] * image.extent.width, y: image.extent.minY + (1 - $0[1]) * image.extent.height) }
    return image.applyingFilter("CIPerspectiveCorrection", parameters: ["inputTopLeft": points[0], "inputTopRight": points[1], "inputBottomRight": points[2], "inputBottomLeft": points[3]])
  }

}
