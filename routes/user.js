import express from "express";

import sql from "../db.js";
import { verify_jwt, s3_file_upload } from "../libs/common.js";

const router = express.Router();

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
    CASE WHEN count(user_hashtag.hashtag) > 0 
        THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag) ) 
        ELSE ARRAY[]::json[] 
        END as hashtag_arr
  from users 
  left join user_hashtag 
  on users.id = user_hashtag.user_id
  where ${
    search_word === ""
      ? last_user_id === ""
        ? // ? sql`TRUE`
          sql`users.nickname != '탈퇴회원'`
        : sql`users.id < ${last_user_id} and 
              users.nickname != '탈퇴회원'`
      : last_user_id === ""
      ? sql`user_hashtag.hashtag = ${search_word} and 
            users.nickname != '탈퇴회원'`
      : sql`users.id < ${last_user_id} and 
            user_hashtag.hashtag = ${search_word} and 
            users.nickname != '탈퇴회원'`
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
 * 닉네임 중복 확인
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
      firebase.notification_token
    from users
    left join user_hashtag
      on users.id = user_hashtag.user_id
    left join firebase
      on users.id = firebase.user_id
    where users.id=${user_id_filter}
    group by users.id, firebase.notification_token`;

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
      CASE WHEN count(user_hashtag.hashtag) > 0 
        THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag) ) 
        ELSE ARRAY[]::json[] 
        END as hashtag_arr
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
 * 유저 삭제
 */
router.post("/withdrawl_account", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_sql = await sql`update users set
      nickname = ${"탈퇴회원"}
    where id = ${verify_access_token.user_id}
    returning user_initial_id`;

    await sql`delete from user_initial
    where id = ${user_sql[0].user_initial_id}`;

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
