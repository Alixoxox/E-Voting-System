import { v2 as cloudinary } from 'cloudinary';
import pkg from 'multer-storage-cloudinary';
const { CloudinaryStorage } = pkg;
import multer from 'multer';

cloudinary.config({
  cloud_name: 'duucjg3rr',
  api_key: '361559229486151',
  api_secret: 'NYaaXlvHvEp6xvKk7qwRn8t_Bio'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  }
});

export const upload = multer({ storage: storage });