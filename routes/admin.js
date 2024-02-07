import express from "express";

import { verify_jwt } from "../libs/common.js";
import sql from "../db.js";

const router = express.Router();

/**
 * 관리자 로그인
 */
router.post("/admin_login", async (req, res) => {
  try {
    const { user_id, password } = req.body.data;
    // const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    // const verify_access_token = verify_jwt(token);
    // await sql`insert into like_user
    //   (user_id, liked_user_id)
    // values
    //   (${verify_access_token.user_id},${user_id})`;
    // await sql`update users
    //   set liked_user_count = liked_user_count + 1
    //   where id = ${user_id}`;
    // res.json({
    //   status: "ok",
    // });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * 찜한 유저 조회
 */
router.post("/get_like_user_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_id_filter =
      user_id === "" ? verify_access_token.user_id : user_id;

    const sql_like_user_arr = await sql`select 
      user_id, liked_user_id
    from like_user
    where user_id = ${user_id_filter}`;

    res.json({
      status: "ok",
      data: {
        like_user_arr: sql_like_user_arr,
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
 * 조사 찜 취소
 */
router.post("/unlike", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`delete from like_user 
    where user_id=${verify_access_token.user_id} and liked_user_id=${user_id}`;

    await sql`update users
    set liked_user_count = liked_user_count - 1
    where id = ${user_id}`;

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

export default router;
