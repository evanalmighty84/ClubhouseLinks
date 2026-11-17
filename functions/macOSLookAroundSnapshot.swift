import AppKit
import CoreLocation
import Foundation
import MapKit

@main
struct LookAroundSnapshotCLI {
    static func report(_ message: String) {
        FileHandle.standardError.write(Data((message + "\n").utf8))
    }

    @MainActor
    static func main() async {
        guard #available(macOS 13.0, *) else {
            report("macOS 13 or later is required.")
            exit(1)
        }
        let args = CommandLine.arguments
        guard args.count == 4, let lat = Double(args[1]), let lng = Double(args[2]),
              lat.isFinite, lng.isFinite, (-90...90).contains(lat), (-180...180).contains(lng) else {
            report("Usage: lookaround-snapshot LAT LNG OUTPUT.png")
            exit(2)
        }
        do {
            let found = try await capture(
                CLLocationCoordinate2D(latitude: lat, longitude: lng),
                to: URL(fileURLWithPath: args[3])
            )
            if !found {
                report("Apple Look Around returned no scene for this coordinate.")
                exit(3)
            }
            print("Look Around PNG saved.")
        } catch {
            report("Look Around capture failed: \(error.localizedDescription)")
            exit(1)
        }
    }

    @available(macOS 13.0, *)
    @MainActor
    static func capture(_ coordinate: CLLocationCoordinate2D, to destination: URL) async throws -> Bool {
        let request = MKLookAroundSceneRequest(coordinate: coordinate)
        let scene: MKLookAroundScene? = try await withCheckedThrowingContinuation { continuation in
            request.getSceneWithCompletionHandler { scene, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: scene) }
            }
        }
        withExtendedLifetime(request) {}
        guard let scene else { return false }

        let options = MKLookAroundSnapshotter.Options()
        options.size = CGSize(width: 800, height: 480)
        let snapshotter = MKLookAroundSnapshotter(scene: scene, options: options)
        let snapshot: MKLookAroundSnapshotter.Snapshot? = try await withCheckedThrowingContinuation { continuation in
            snapshotter.getSnapshotWithCompletionHandler { snapshot, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: snapshot) }
            }
        }
        withExtendedLifetime(snapshotter) {}
        guard let snapshot,
              let tiff = snapshot.image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff),
              let png = bitmap.representation(using: .png, properties: [:]) else {
            throw NSError(domain: "LookAroundSnapshotCLI", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Apple returned no encodable image."])
        }
        try png.write(to: destination, options: .atomic)
        return true
    }
}
