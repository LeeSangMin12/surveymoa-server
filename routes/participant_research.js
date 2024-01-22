import express from "express";

import sql from "../db.js";

const router = express.Router();

/**
 * 참여 설문 조회
 */
router.post("/get_participant_research_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const sql_participant_research = await sql`select 
      user_id, research_id
    from participant_research
    where user_id = ${user_id}`;

    res.json({
      status: "ok",
      data: {
        participant_research_arr: sql_participant_research,
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
