import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();  //env 파일 가져오기
const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY
} = process.env;


const s3_client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

export { s3_client };