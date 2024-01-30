import express from "express";

import { verify_jwt } from "../libs/common.js";
import sql from "../db.js";

const router = express.Router();

/**
 * 조사 찜
 */
router.post("/like", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`insert into like_research
      (user_id, research_id)
    values
      (${verify_access_token.user_id},${research_id})`;

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
 * 찜한 설문 조회
 */
router.post("/get_like_research_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const sql_like_research = await sql`select 
      user_id, research_id
    from like_research
    where user_id = ${user_id}`;

    res.json({
      status: "ok",
      data: {
        like_research_arr: sql_like_research,
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
    const { research_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`delete from like_research 
    where user_id=${verify_access_token.user_id} and research_id=${research_id}`;

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
