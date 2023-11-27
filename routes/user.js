import express from "express";
import { default as mongodb } from "mongodb";
import dotenv from "dotenv";

import { verify_jwt, s3_file_upload } from "../libs/common.js";

dotenv.config(); //env 파일 가져오기
const { DB_URL } = process.env;

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

/**
 * 유저 초기 정보 세팅
 */
router.post("/initial_setting", async (req, res) => {
  try {
    const { nickname, gender, year_of_birth, means_of_contact } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        $set: {
          nickname,
          gender,
          year_of_birth,
          means_of_contact,
          hashtag_arr: [],
          self_introduction: "",
          user_img: "",
          participate_research_arr: [],
          participate_research_count: 0,
          receive_star_count: 0,
          receive_star_arr: [],
          receive_like_count: 0,
          receive_like_arr: [],
        },
      }
    );

    res.json({
      status: "ok",
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * 유저 정보를 가져오기
 */
router.post("/get_info", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const get_user_info = await db.collection("login").findOne({
      _id: ObjectId(verify_access_token.user_id),
    });

    console.log("get_user_info", get_user_info);

    const user_info = {
      gender: get_user_info.gender,
      means_of_contact: get_user_info.means_of_contact,
      nickname: get_user_info.nickname,
      year_of_birth: get_user_info.year_of_birth,
    };

    res.json({
      status: "ok",
      data: {
        user_info: user_info,
      },
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "유저 데이터를 불러오지 못했습니다.",
    });
  }
});

/**
 * 유저 정보 수정
 */
router.post(
  "/edit_info",
  s3_file_upload("user/profile_img").single("img_url"),
  async (req, res) => {
    try {
      const { nickname, is_empty_img } = req.body;
      const img_url = req.file === undefined ? "" : { uri: req.file.location };

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

      const update_data = { nickname };

      if (img_url !== "" || is_empty_img === "true") {
        //유저가 이미지를 바꾸고 수정해야만, db에 유저이미지를 수정. +빈값일때도 저장
        update_data.img_url = img_url;
      }

      await db
        .collection("login")
        .updateOne(
          { _id: ObjectId(verify_access_token.user_id) },
          { $set: update_data }
        );

      res.json({
        status: "ok",
      });
    } catch (error) {
      console.error("error:", error);
      res.status(500).json({
        status: "error",
        message: "유저 데이터를 저장하지 못했습니다.",
      });
    }
  }
);

/**
 * 유저 삭제
 */
router.post("/withdrawl_account", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db
      .collection("login")
      .deleteOne({ _id: ObjectId(verify_access_token.user_id) });

    await db
      .collection("semester")
      .deleteMany({ user_id: verify_access_token.user_id });

    await db
      .collection("assignment")
      .deleteMany({ user_id: verify_access_token.user_id });

    res.json({
      status: "ok",
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "유저 데이터를 저장하지 못했습니다.",
    });
  }
});

export default router;
