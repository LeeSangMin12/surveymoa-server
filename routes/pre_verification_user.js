import express from "express";

import { verify_jwt } from "../libs/common.js";
import sql from "../db.js";

const router = express.Router();

/**
 * 사전검증 유저 저장
 */
router.post("/regi_pre_verification_user", async (req, res) => {
  try {
    const { research_id, status } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`INSERT INTO pre_verification_user
      (
        user_id,
        research_id,
        status
      )
    VALUES
      (
        ${verify_access_token.user_id},
        ${research_id},
        ${status}
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
 * 사전검증 유저 조회
 */
router.post("/get_pre_verification_user_arr", async (req, res) => {
  try { 
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const pre_verification_user_arr_sql = await sql`SELECT 
      research_id,
      status
    FROM pre_verification_user
    WHERE user_id = ${verify_access_token.user_id}`;

    res.json({
      status: "ok",
      data : {
        pre_verification_user_arr: pre_verification_user_arr_sql
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

export default router;
