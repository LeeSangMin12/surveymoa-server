import express from "express";
import axios from "axios";
import { default as mongodb } from "mongodb";
import dotenv from "dotenv";
import fs from "fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { make_jwt } from "../libs/common.js";

dotenv.config(); //env 파일 가져오기
const {
  DB_URL,
  REDIRECT_URI,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  KAKAO_CLIENT_ID,
  KAKAO_CLIENT_SECRET,
  APPLE_CLIENT_ID,
  APPLE_TEAM_ID,
  APPLE_SERVICE_ID,
  APPLE_KEY_ID,
} = process.env;

const router = express.Router();
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;
let db;

MongoClient.connect(
  DB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) throw err;

    db = client.db("survey_moa");
  }
);

const __filename = fileURLToPath(new URL(import.meta.url));
const __dirname = dirname(__filename);

/**
 * 애플은 token 발급시 cliet_secret을 만들어줘야해서 만듬.
 */
const create_apple_secret = () => {
  const private_key_file = fs.readFileSync(
    join(__dirname, "../libs/authkey.p8")
  );

  const token = jwt.sign({}, private_key_file, {
    algorithm: "ES256",
    expiresIn: "60 days",
    audience: "https://appleid.apple.com",
    issuer: APPLE_TEAM_ID,
    subject: APPLE_SERVICE_ID,
    keyid: APPLE_KEY_ID,
  });
  return token;
};

const platform_config = {
  google: {
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    token_url: "https://www.googleapis.com/oauth2/v4/token?",
    user_info_url: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  kakao: {
    client_id: KAKAO_CLIENT_ID,
    client_secret: KAKAO_CLIENT_SECRET,
    token_url: "https://kauth.kakao.com/oauth/token?",
    user_info_url: "https://kapi.kakao.com/v2/user/me",
  },
  apple: {
    client_id: APPLE_CLIENT_ID,
    create_secret_method: create_apple_secret,
    token_url: "https://appleid.apple.com/auth/token?",
  },
};

/**
 * authorization_code로 token을 발급
 */
const get_token = async (platform, token_url, authorization_code) => {
  let auth_url =
    token_url +
    `grant_type=authorization_code&` +
    `code=${authorization_code}&` +
    `client_id=${platform_config[platform].client_id}&` +
    `client_secret=${
      platform === "apple"
        ? platform_config[platform].create_secret_method()
        : platform_config[platform].client_secret
    }&` +
    `redirect_uri=${REDIRECT_URI}&`;

  const token_info = await axios
    .post(auth_url, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    })
    .then((el) => {
      return el.data;
    })
    .catch((err) => {
      console.log("err", err);
    });

  return token_info;
};

/**
 * 가입한 사용자의 고유 id 반환
 */
const get_user_id = async (platform, user_info_url, access_token) => {
  const user_info = await axios
    .get(user_info_url, {
      headers: {
        authorization: `Bearer ${access_token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    })
    .then((el) => {
      return el.data;
    })
    .catch((err) => {
      console.log("err", err);
    });

  const id_wrapper = {
    kakao: (user_info) => user_info.id,
  };
  return id_wrapper[platform](user_info);
};

/**
 * 유저 정보 가져오기
 * : 등록된 회원 : db에서 정보 가져옴
 * : 신규 회원 : db에 신규 회원 정보 추가
 */
const get_user_info = async (token_info, platform_id, is_exist_user) => {
  if (is_exist_user) {
    //이미 등록한 회원일때
    return is_exist_user;
  } else {
    //신규 회원일때
    const new_user = await db.collection("login").insertOne({
      platform_access_token: token_info.access_token,
      platform_refresh_token: token_info.refresh_token,
      platform_token_expires: token_info.expires_in,
      platform_id: platform_id,
    });

    return new_user.ops[0];
  }
};

const process_login = async (platform, req, res) => {
  const { authorization_code } = req.body.data;

  const config = platform_config[platform];
  const token_info = await get_token(
    platform,
    config.token_url,
    authorization_code
  );

  let platform_id;
  if (platform === "apple") {
    // Apple의 경우 sub를 이메일로 사용(애플은 1.이메일 주소를 안넘겨줄 수 있음, 2.무조건 첫 로그인만 넘겨줌)
    platform_id = jwt.decode(token_info.id_token).sub;
  } else {
    // Google과 Kakao는 API를 통해 이메일을 가져옵니다.
    platform_id = await get_user_id(
      platform,
      config.user_info_url,
      token_info.access_token
    );
  }

  const is_exist_user = await db.collection("login").findOne({ platform_id });
  const user_info = await get_user_info(token_info, platform_id, is_exist_user);
  const { access_token, refresh_token } = make_jwt(user_info._id, platform_id);

  //refresh token만 db에 저장 - access token은 client가 관리
  await db
    .collection("login")
    .updateOne(
      { _id: ObjectId(user_info._id) },
      { $set: { refresh_token: refresh_token } }
    );

  // 소셜로그인 후 회원가입 정보 등록 안하면 회원가입 하지 않은걸로 처리 (nickname은 가입 필수조건)
  const registered = user_info && user_info.nickname !== undefined;

  res.json({
    registered: registered.toString(),
    user_id: user_info._id,
    access_token: access_token,
  });
};

router.post("/google", async (req, res) => {
  process_login("google", req, res);
});

router.post("/kakao", async (req, res) => {
  process_login("kakao", req, res);
});

router.post("/apple", async (req, res) => {
  process_login("apple", req, res);
});

export default router;
