import express from "express";

import { verify_jwt } from "../libs/common.js";
import sql from "../db.js";

const router = express.Router();

/**
 * 사전검증 조사 저장
 */
router.post("/regi_pre_verification_research", async (req, res) => {
  try {
    const {
      research_id,
      category, 
      questions 
    } = req.body.data;

    await sql`INSERT INTO pre_verification_research
      (
        research_id,
        category,
        questions
      )
    VALUES
      (
        ${research_id},
        ${category},
        ${questions}
      )
    `;

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
 * 조사 사전검증 리스트 조회
 */
router.post("/get_pre_verification_research_arr", async (req, res) => {
  try { 
    const pre_verification_research_arr_sql = await sql`SELECT 
      research.id AS research_id,
      research.title AS research_title,
      pre_verification_research.id AS pre_verification_research_id,
      pre_verification_research.category,
      pre_verification_research.questions
    FROM research
    LEFT JOIN pre_verification_research
      ON research.id = pre_verification_research.research_id
    `;

    res.json({
      status: "ok",
      data : {
        pre_verification_research_arr: pre_verification_research_arr_sql
      }
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
 * 사전검증 조사 삭제
 */
router.post("/del_pre_verification_research", async (req, res) => {
  try {
    const {
      pre_verification_research_id,
    } = req.body.data;

    await sql`DELETE FROM pre_verification_research
    WHERE id = ${pre_verification_research_id}`;

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
