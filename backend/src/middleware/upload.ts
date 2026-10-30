import multer from 'multer';
import path from 'path';
import fs from 'fs';

const createStorage = (subfolder: string) => {
  const uploadPath = path.join(__dirname, '../../uploads', subfolder);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  });
};

export const uploadAvatar = multer({ storage: createStorage('avatars') });
export const uploadKyc = multer({ storage: createStorage('kyc') });
export const uploadPostMedia = multer({ storage: createStorage('posts') });
export const uploadSlip = multer({ storage: createStorage('slips') });
export const uploadChatMedia = multer({ storage: createStorage('chat') });
export const uploadBankQr = multer({ storage: createStorage('bankqr') });
export const uploadCover = multer({ storage: createStorage('covers') });
