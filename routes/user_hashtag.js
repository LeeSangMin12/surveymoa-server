import express from "express";

import sql from "../db.js";
import { verify_jwt } from "../libs/common.js";

const router = express.Router();

/**
 * hashtag등록
 */
router.post("/regi_hashtag_arr", async (req, res) => {
  try {
    const { add_hashtag_arr, delete_hashtag_arr } = req.body.data;

    if (add_hashtag_arr.length > 0) {
      await sql`insert into user_hashtag ${sql(
        add_hashtag_arr,
        "user_id",
        "hashtag"
      )}`;
    }

    await sql`delete from user_hashtag where id in ${sql(delete_hashtag_arr)}`;

    res.json({
      status: "ok",
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
 * hashtag 조회
 */
router.post("/get_hashtag_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_id_filter =
      user_id === "" ? verify_access_token.user_id : user_id;

    const sql_hashtag_arr = await sql`select 
      id, hashtag
    from user_hashtag
    where user_id = ${user_id_filter}`;

    res.json({
      status: "ok",
      data: {
        hashtag_arr: sql_hashtag_arr,
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
