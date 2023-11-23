import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";
import multerS3 from "multer-s3";

// import { s3_client } from "../../libs/aws_sample_client";
import { s3_client } from "./aws_sample_client.js";

dotenv.config(); //env 파일 가져오기
const { JWT_SECRET, AWS_BUCKET_NAME } = process.env;

/**
 * jwt 토큰을 생성
 */
export const make_jwt = (user_id, platform_id) => {
  const params = {
    access_token: "",
    refresh_token: "",
  };

  const access_token = jwt.sign(
    {
      user_id: user_id,
      platform_id: platform_id,
    },
    JWT_SECRET,
    {
      expiresIn: "55m",
      issuer: "survey_moa",
    }
  );

  const refresh_token = jwt.sign(
    {
      user_id: user_id,
      platform_id: platform_id,
    },
    JWT_SECRET,
    {
      expiresIn: "40d",
      issuer: "survey_moa",
    }
  );

  params.access_token = access_token;
  params.refresh_token = refresh_token;

  return params;
};

/**
 * jwt token정보 verify
 */
export const verify_jwt = (token) => {
  try {
    const verify_token = jwt.verify(token, JWT_SECRET);
    return verify_token;
  } catch (err) {
    return "expired";
  }
};

/**
 * s3에 파일을 업로드 해준다.
 */
export const s3_file_upload = (path_prefix) =>
  multer({
    storage: multerS3({
      s3: s3_client,
      bucket: AWS_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      acl: "public-read",
      key: (req, file, cb) => {
        const current_date = new Date();
        const year = current_date.getFullYear();
        const month = String(current_date.getMonth() + 1).padStart(2, "0");
        const date = String(current_date.getDate()).padStart(2, "0");

        const file_name = Buffer.from(file.originalname, "latin1").toString(
          "utf8"
        );
        const file_path = `${path_prefix}/${year}/${month}/${date}/${Date.now()}_${file_name}`;
        cb(null, file_path);
      },
    }),
  });
