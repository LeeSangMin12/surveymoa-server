import express from "express";

import sql from "../db.js";
import { verify_jwt } from "../libs/common.js";

const router = express.Router();

/**
 * firebase 알림 토큰 저장
 */
router.post("/regi_notification_token", async (req, res) => {
  try {
    const { notification_token, created } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`insert into firebase
      (user_id, notification_token, created)
    values
      (${verify_access_token.user_id}, ${notification_token}, ${new Date(
      created
    )})`;

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
 * 알림 토큰 조회
 */
router.post("/get_notification_token", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_id_filter =
      user_id === "" ? verify_access_token.user_id : user_id;

    const notification_token_sql = await sql`select
      id, user_id, notification_token, created 
    from firebase
    where user_id = ${user_id_filter}`;

    res.json({
      status: "ok",
      data: {
        notification_token: notification_token_sql,
      },
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
 * firebase 알림 토큰 수정
 */
router.post("/edit_notification_token", async (req, res) => {
  try {
    const { notification_token, created } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`update firebase set
      notification_token = ${notification_token},
      created = ${new Date(created)}
    where user_id = ${verify_access_token.user_id}`;

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
