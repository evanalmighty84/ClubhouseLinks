const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use in-memory storage (Catalyst-safe)
const upload = multer({ storage: multer.memoryStorage() });

// ✅ This is the function used in your router
exports.uploadImage = (req, res) => {
    // Multer must be called inside the handler for Catalyst
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            // Create a unique temp file path
            const tempDir = os.tmpdir(); // Catalyst-safe temporary folder
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const filename = uniqueSuffix + path.extname(req.file.originalname);
            const filePath = path.join(tempDir, filename);

            // Write the file buffer to the temp path
            fs.writeFileSync(filePath, req.file.buffer);

            console.log('✅ File temporarily saved at:', filePath);

            // In a real app: Upload to cloud storage or return buffer directly
            const fileUrl = `file://${filePath}`; // TEMP URL just for debugging/logging

            return res.status(200).json({
                message: 'File uploaded and saved temporarily',
                filename,
                tempPath: filePath,
                url: fileUrl,
            });
        } catch (error) {
            console.error('Error saving temp file:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
};
