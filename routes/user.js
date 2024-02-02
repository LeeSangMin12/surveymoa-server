import express from "express";
import { default as mongodb } from "mongodb";
import dotenv from "dotenv";

import sql from "../db.js";
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
 * 유저 리스트 검색
 */
const search_user = async (search_word, last_user_id) => {
  const user_arr = await sql`
  select
    users.id,
    nickname,
    gender,
    year_of_birth,
    self_introduction,
    user_img,
    rating_research,
    CASE WHEN count(user_hashtag.hashtag) > 0 THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag)) END as hashtag_arr
  from users 
  left join user_hashtag 
  on users.id = user_hashtag.user_id
  where ${
    search_word === ""
      ? last_user_id === ""
        ? sql`TRUE`
        : sql`users.id < ${last_user_id}`
      : last_user_id === ""
      ? sql`user_hashtag.hashtag = ${search_word}`
      : sql`users.id < ${last_user_id} and user_hashtag.hashtag = ${search_word}`
  }
  group by users.id
  ORDER BY users.id desc
  limit 10;
`;
  return user_arr;
};

/**
 * 유저 초기 정보 세팅
 */
router.post("/initial_setting", async (req, res) => {
  try {
    const { nickname, gender, year_of_birth } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`update users set
      nickname=${nickname},
      gender=${gender},
      year_of_birth=${year_of_birth}
    where id = ${verify_access_token.user_id}`;

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
 * 중복된 닉네임 존재유무 확인
 */
router.post("/duplicate_check_nickname", async (req, res) => {
  const { nickname } = req.body.data;

  const is_duplicate_nickanme = await sql`select COUNT(*) from users 
  where nickname = ${nickname}`;

  if (is_duplicate_nickanme[0].count === "0") {
    //중복 닉네임이 없음
    res.json({
      status: "ok",
    });
  } else {
    //중복 닉네임 존재
    res.json({
      status: "duplication_nickname_exist",
    });
  }
});

/**
 * 유저 초기정보 조회
 */
router.post("/get_initial_info", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_id_filter =
      user_id === "" ? verify_access_token.user_id : user_id;

    const sql_users = await sql`select 
      nickname,
      gender,
      year_of_birth,
      CASE WHEN count(user_hashtag.hashtag) > 0 
        THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag) ) 
        ELSE ARRAY[]::json[] 
        END as hashtag_arr,
      self_introduction,
      user_img,
      liked_user_count,
      rating_research,
      accumulated_money
    from users
    left join user_hashtag
    on users.id = user_hashtag.user_id
    where users.id=${user_id_filter}
    group by users.id`;

    res.json({
      status: "ok",
      data: {
        user_info: sql_users[0],
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
 * 유저 리스트 id배열로 가져오기
 */
router.post("/get_user_arr_by_user_id_arr", async (req, res) => {
  try {
    const { user_id_arr } = req.body.data;

    const sql_user_arr = await sql`select 
      users.id,
      nickname,
      gender,
      year_of_birth,
      self_introduction,
      user_img,
      rating_research,
      CASE WHEN count(user_hashtag.hashtag) > 0 THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag)) END as hashtag_arr
    from users
    left join user_hashtag 
    on users.id = user_hashtag.user_id
    where users.id in ${sql(user_id_arr)}
    group by users.id
    ORDER BY id desc`;

    res.json({
      status: "ok",
      data: { user_arr: sql_user_arr },
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
 * 전문가 조사 검색
 */
router.post("/search_user_arr", async (req, res) => {
  try {
    const { search_word, last_user_id } = req.body.data;

    const search_user_arr = await search_user(search_word, last_user_id);

    res.json({
      status: "ok",
      data: {
        search_user_arr: search_user_arr,
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
 * 유저 초기 정보 수정
 */
router.post(
  "/edit_setting",
  s3_file_upload("user/profile_img").single("user_img"),
  async (req, res) => {
    try {
      const { user_img, nickname, gender, year_of_birth } = req.body;

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

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

      await sql`update users set 
        user_img=${img_url},
        nickname=${nickname},
        gender=${gender},
        year_of_birth=${year_of_birth}
      where id  = ${verify_access_token.user_id}`;

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
 * 유저 정보 리스트를 userid값으로 조회
 */
router.post("/get_user_info_arr_by_id", async (req, res) => {
  try {
    const { user_id_arr } = req.body.data;

    const user_id_objectid_arr = user_id_arr.map((id) => ObjectId(id));

    const user_info_arr = await db
      .collection("login")
      .find(
        {
          _id: { $in: user_id_objectid_arr },
        },
        {
          projection: {
            _id: 1,
            nickname: 1,
            user_img: 1,
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

    await sql`update users set self_introduction=${self_introduction}
    where id = ${verify_access_token.user_id}`;

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
 * 유저 찜
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

/**https://www.k-startup.go.kr/#main-section_2
 * 조사에 해당하는 유저 리스트 조회
 */
router.post("/get_user_arr_by_research_id", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const sql_user_arr = await sql`select 
      users.id,
      nickname,
      gender,
      year_of_birth,
      self_introduction,
      user_img,
      rating_research,
      CASE WHEN count(user_hashtag.hashtag) > 0 THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag)) END as hashtag_arr
    from users 
    where ${
      search_word === ""
        ? last_user_id === ""
          ? sql`TRUE`
          : sql`users.id < ${last_user_id}`
        : last_user_id === ""
        ? sql`user_hashtag.hashtag = ${search_word}`
        : sql`users.id < ${last_user_id} and user_hashtag.hashtag = ${search_word}`
    }
    group by users.id
    ORDER BY users.id desc
    `;

    const search_user_arr = await search_user(search_word, last_user_id);

    res.json({
      status: "ok",
      data: {
        user_arr: user_arr,
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

export default router;
