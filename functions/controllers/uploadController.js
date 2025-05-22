const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Cloudinary setup
cloudinary.config({
    cloud_name: 'duz4vhtcn',
    api_key: '922468697412882',
    api_secret: 'K-CAP3rlMC-ADlYo093CXaT_Jcc',
});

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadImage = (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            const mimetype = req.file.mimetype;
            const isPdfOrNonImage = !mimetype.startsWith('image/');

            const streamUpload = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'uploads',
                            public_id: uuidv4(),
                            resource_type: isPdfOrNonImage ? 'raw' : 'image' // 👈 KEY LINE
                        },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            const result = await streamUpload();
            res.status(200).json({
                message: 'Uploaded successfully to Cloudinary',
                url: result.secure_url,
                resourceType: isPdfOrNonImage ? 'raw' : 'image'
            });
        } catch (uploadError) {
            console.error('Cloudinary upload failed:', uploadError);
            res.status(500).json({ error: 'Cloudinary upload failed' });
        }
    });
};
