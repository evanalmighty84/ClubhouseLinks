// Creates an unmistakable synthetic debug PNG. No Maps imagery is requested.
import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else {
    fputs("Usage: house-test-image OUTPUT.png\n", stderr)
    exit(2)
}
let output = URL(fileURLWithPath: CommandLine.arguments[1])
let size = NSSize(width: 800, height: 480)
let image = NSImage(size: size)
image.lockFocus()
NSColor(calibratedRed: 0.08, green: 0.16, blue: 0.28, alpha: 1).setFill()
NSRect(origin: .zero, size: size).fill()

let heading = "TEST IMAGE"
let subtitle = "NOT AN ACTUAL HOME PHOTOGRAPH"
let footer = "Clubhouse Links | Synthetic workflow test"
let center = NSMutableParagraphStyle()
center.alignment = .center

func draw(_ text: String, y: CGFloat, fontSize: CGFloat, color: NSColor) {
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: fontSize),
        .foregroundColor: color,
        .paragraphStyle: center
    ]
    (text as NSString).draw(
        in: NSRect(x: 16, y: y, width: 768, height: fontSize + 38),
        withAttributes: attributes
    )
}
draw(heading, y: 278, fontSize: 72, color: .white)
draw(subtitle, y: 214, fontSize: 29, color: .systemYellow)
draw(footer, y: 74, fontSize: 21, color: .white)
image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Unable to encode synthetic debug image\n", stderr)
    exit(1)
}
try png.write(to: output, options: .atomic)
print("Synthetic test PNG generated")
