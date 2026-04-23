import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import Vision

struct FiguraBatchError: Error, CustomStringConvertible {
    let message: String

    var description: String { message }
}

let supportedExtensions = Set(["png", "jpg", "jpeg", "webp"])
let ciContext = CIContext()

func usage() {
    let command = URL(fileURLWithPath: CommandLine.arguments.first ?? "figura_batch.swift").lastPathComponent
    print("Usage: swift \(command) <input-root> <output-root> <folder> [<folder> ...]")
}

func createMaskImage(from inputImage: CIImage) throws -> CIImage {
    let handler = VNImageRequestHandler(ciImage: inputImage)
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])

    guard let result = request.results?.first else {
        throw FiguraBatchError(message: "Vision did not return a foreground mask.")
    }

    let maskPixel = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
    return CIImage(cvPixelBuffer: maskPixel)
}

func removeBackground(from imageURL: URL) throws -> CGImage {
    guard let image = NSImage(contentsOf: imageURL) else {
        throw FiguraBatchError(message: "Failed to load image: \(imageURL.path)")
    }

    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw FiguraBatchError(message: "Failed to create CGImage: \(imageURL.path)")
    }

    let ciImage = CIImage(cgImage: cgImage)
    let maskImage = try createMaskImage(from: ciImage)

    let filter = CIFilter.blendWithMask()
    filter.inputImage = ciImage
    filter.maskImage = maskImage
    filter.backgroundImage = CIImage.empty()

    guard let outputImage = filter.outputImage,
          let outputCGImage = ciContext.createCGImage(outputImage, from: outputImage.extent)
    else {
        throw FiguraBatchError(message: "Failed to render processed image: \(imageURL.path)")
    }

    return outputCGImage
}

func savePNG(_ image: CGImage, to outputURL: URL) throws {
    let bitmap = NSBitmapImageRep(cgImage: image)
    guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
        throw FiguraBatchError(message: "Failed to encode PNG: \(outputURL.path)")
    }

    try FileManager.default.createDirectory(
        at: outputURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try pngData.write(to: outputURL)
}

func imageFiles(in folderURL: URL) throws -> [URL] {
    guard FileManager.default.fileExists(atPath: folderURL.path) else {
        throw FiguraBatchError(message: "Folder not found: \(folderURL.path)")
    }

    let enumerator = FileManager.default.enumerator(
        at: folderURL,
        includingPropertiesForKeys: [.isRegularFileKey],
        options: [.skipsHiddenFiles]
    )

    var results: [URL] = []
    while let fileURL = enumerator?.nextObject() as? URL {
        let values = try fileURL.resourceValues(forKeys: [.isRegularFileKey])
        guard values.isRegularFile == true else { continue }
        if supportedExtensions.contains(fileURL.pathExtension.lowercased()) {
            results.append(fileURL)
        }
    }

    return results.sorted { $0.path < $1.path }
}

func outputURL(for imageURL: URL, inputRoot: URL, outputRoot: URL) -> URL {
    let relativeComponents = Array(imageURL.standardizedFileURL.pathComponents.dropFirst(inputRoot.standardizedFileURL.pathComponents.count))
    let directoryComponents = relativeComponents.dropLast()
    let outputName = (((relativeComponents.last ?? imageURL.lastPathComponent) as NSString).deletingPathExtension as NSString).appendingPathExtension("png") ?? imageURL.deletingPathExtension().lastPathComponent + ".png"

    var result = outputRoot
    for component in directoryComponents {
        result.appendPathComponent(component, isDirectory: true)
    }
    result.appendPathComponent(outputName)
    return result
}

if CommandLine.arguments.count < 4 {
    usage()
    exit(1)
}

let inputRoot = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let outputRoot = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let folders = Array(CommandLine.arguments.dropFirst(3))

var processed = 0
var failures: [String] = []

for folder in folders {
    let folderURL = inputRoot.appendingPathComponent(folder, isDirectory: true)

    do {
        let files = try imageFiles(in: folderURL)
        print("folder \(folder): found \(files.count) image(s)")

        for imageURL in files {
            let destinationURL = outputURL(for: imageURL, inputRoot: inputRoot, outputRoot: outputRoot)
            do {
                let outputImage = try removeBackground(from: imageURL)
                try savePNG(outputImage, to: destinationURL)
                processed += 1
                print("processed \(imageURL.path) -> \(destinationURL.path)")
            } catch {
                let message = "failed \(imageURL.path): \(error)"
                failures.append(message)
                fputs(message + "\n", stderr)
            }
        }
    } catch {
        let message = "failed folder \(folderURL.path): \(error)"
        failures.append(message)
        fputs(message + "\n", stderr)
    }
}

print("done processed=\(processed) failures=\(failures.count) output=\(outputRoot.path)")
if !failures.isEmpty {
    exit(2)
}
