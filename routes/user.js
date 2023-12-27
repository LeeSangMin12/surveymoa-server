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
          rating_research_count: 0,
          rating_research_arr: [],
          rating_research: 0,
          like_research_count: 0,
          like_research_arr: [],
          like_user_count: 0,
          like_user_arr: [],
          liked_user_count: 0,
          liked_user_arr: [],
          accumulated_money: 0,
          accumulated_money_arr: [],
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
 * 유저 초기 정보 수정
 */
router.post(
  "/edit_setting",
  s3_file_upload("user/profile_img").single("user_img"),
  async (req, res) => {
    try {
      const { user_img, nickname, gender, year_of_birth, means_of_contact } =
        req.body;

      let img_url;
      if (req.file === undefined) {
        if (user_img !== "") {
          img_url = user_img;
        } else {
          img_url = "";
        }
      } else {
        img_url = req.file.location;
      }

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

      await db.collection("login").updateOne(
        { _id: ObjectId(verify_access_token.user_id) },
        {
          $set: {
            user_img: img_url,
            nickname,
            gender,
            year_of_birth,
            means_of_contact,
            img_url,
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
        message: "유저 데이터를 저장하지 못했습니다.",
      });
    }
  }
);

/**
 * 유저 초기정보 조회
 */
router.post("/get_initial_info", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_info = await db.collection("login").findOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        projection: {
          _id: 1,
          nickname: 1,
          gender: 1,
          means_of_contact: 1,
          year_of_birth: 1,
          hashtag_arr: 1,
          self_introduction: 1,
          user_img: 1,
        },
      }
    );

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
 * 유저 정보를 가져오기
 */
router.post("/get_info", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const get_user_info = await db.collection("login").findOne({
      _id: ObjectId(verify_access_token.user_id),
    });

    const user_info = {
      user_img: get_user_info.user_img,
      gender: get_user_info.gender,
      means_of_contact: get_user_info.means_of_contact,
      hashtag_arr: get_user_info.hashtag_arr,
      self_introduction: get_user_info.self_introduction,
      nickname: get_user_info.nickname,
      year_of_birth: get_user_info.year_of_birth,
      rating_research: get_user_info.rating_research,
      rating_research_arr: get_user_info.rating_research_arr,
      liked_user_count: get_user_info.liked_user_count,
      participate_research_arr: get_user_info.participate_research_arr,
      accumulated_money: get_user_info.accumulated_money,
      accumulated_money_arr: get_user_info.accumulated_money_arr,
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
 * 유저 아이디로 유저 정보 조회
 */
router.post("/get_info_by_user_id", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const get_user_info = await db.collection("login").findOne({
      _id: ObjectId(user_id),
    });

    const user_info = {
      user_img: get_user_info.user_img,
      gender: get_user_info.gender,
      means_of_contact: get_user_info.means_of_contact,
      hashtag_arr: get_user_info.hashtag_arr,
      self_introduction: get_user_info.self_introduction,
      nickname: get_user_info.nickname,
      year_of_birth: get_user_info.year_of_birth,
      rating_research: get_user_info.rating_research,
      rating_research_arr: get_user_info.rating_research_arr,
      like_research_arr: get_user_info.like_research_arr,
      like_research_count: get_user_info.like_research_count,
      like_user_count: get_user_info.like_user_count,
      like_user_arr: get_user_info.like_user_arr,
      liked_user_count: get_user_info.liked_user_count,
      liked_user_arr: get_user_info.liked_user_arr,
      participate_research_arr: get_user_info.participate_research_arr,
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
 * 유저 조사 찜 목록 조회
 */
router.post("/get_like_research_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user = await db
      .collection("login")
      .findOne(
        {
          _id: ObjectId(user_id === "" ? verify_access_token.user_id : user_id),
        },
        { projection: { like_research_arr: 1 } }
      );

    res.json({
      status: "ok",
      data: {
        like_research_arr: user.like_research_arr,
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
 * 전문가 조사 검색
 */
router.post("/search_user_arr", async (req, res) => {
  try {
    const { search_word, last_user_id } = req.body.data;

    let search_filter;
    //처음 조회할때
    if (last_user_id === "") {
      search_filter =
        search_word === ""
          ? { nickname: { $exists: true } }
          : { nickname: { $exists: true }, hashtag_arr: search_word };
    } else {
      search_filter =
        search_word === ""
          ? {
              _id: { $lt: ObjectId(last_user_id) },
              nickname: { $exists: true },
            }
          : {
              _id: { $lt: ObjectId(last_user_id) },
              nickname: { $exists: true },
              hashtag_arr: search_word,
            };
    }

    const user_info_arr = await db
      .collection("login")
      .find(search_filter, {
        projection: {
          _id: 1,
          nickname: 1,
          gender: 1,
          year_of_birth: 1,
          means_of_contact: 1,
          hashtag_arr: 1,
          user_img: 1,
          rating_research: 1,
        },
      })
      .sort({ _id: -1 })
      .limit(10)
      .toArray();

    res.json({
      status: "ok",
      data: {
        user_info_arr: user_info_arr,
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
 * 유저 정보 리스트를 가져오기
 */
router.post("/get_user_info_arr", async (req, res) => {
  try {
    const { participate_user_arr } = req.body.data;

    const user_id_arr = participate_user_arr.map((user) =>
      ObjectId(user.user_id)
    );
    const user_info_arr = await db
      .collection("login")
      .find(
        {
          _id: { $in: user_id_arr },
        },
        {
          projection: {
            _id: 1,
            nickname: 1,
            gender: 1,
            year_of_birth: 1,
            means_of_contact: 1,
            hashtag_arr: 1,
            self_introduction: 1,
            user_img: 1,
            participate_research_arr: 1,
            participate_research_count: 1,
            rating_research_count: 1,
            rating_research_arr: 1,
            rating_research: 1,
            like_research_count: 1,
            like_research_obj: 1,
          },
        }
      )
      .toArray();

    res.json({
      status: "ok",
      data: {
        user_info_arr: user_info_arr,
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
 * 해시태그 등록
 */
router.post("/regi_hashtag_arr", async (req, res) => {
  try {
    const { hashtag_arr } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      {
        _id: ObjectId(verify_access_token.user_id),
      },
      {
        $set: {
          hashtag_arr,
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
 * 자기소개 등록
 */
router.post("/regi_self_introduction", async (req, res) => {
  try {
    const { self_introduction } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      {
        _id: ObjectId(verify_access_token.user_id),
      },
      {
        $set: {
          self_introduction,
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
 * 유저 찜 기능
 */
router.post("/like_user", async (req, res) => {
  try {
    const { user_id, user_img, my_img } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        $push: {
          like_user_arr: {
            user_id: user_id,
            user_img: user_img,
          },
        },
        $inc: { like_user_count: 1 },
      }
    );

    await db.collection("login").updateOne(
      { _id: ObjectId(user_id) },
      {
        $push: {
          liked_user_arr: {
            user_id: verify_access_token.user_id,
            user_img: my_img,
          },
        },
        $inc: { liked_user_count: 1 },
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
 * 유저 찜 취소
 */
router.post("/unlike_user", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        $pull: {
          like_user_arr: {
            user_id: user_id,
          },
        },
        $inc: { like_user_count: -1 },
      }
    );

    await db.collection("login").updateOne(
      { _id: ObjectId(user_id) },
      {
        $pull: {
          liked_user_arr: {
            user_id: verify_access_token.user_id,
          },
        },
        $inc: { liked_user_count: -1 },
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
 * 유저 삭제
 */
router.post("/withdrawl_account", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db
      .collection("login")
      .deleteOne({ _id: ObjectId(verify_access_token.user_id) });

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
