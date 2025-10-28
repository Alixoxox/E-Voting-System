import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: 'duucjg3rr',
  api_key: '361559229486151',
  api_secret: 'NYaaXlvHvEp6xvKk7qwRn8t_Bio'
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'user_uploads',
    allowed_formats: ['jpg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

export const upload = multer({ storage });