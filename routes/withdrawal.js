import express from "express";

import sql from "../db.js";
import { verify_jwt } from "../libs/common.js";

const router = express.Router();

/**
 * 출금 신청 내역 조회
 */
router.post("/get_withdrawal_arr", async (req, res) => {
  try {
    const withdrawal_arr_sql = await sql`select
      id, 
      user_id,
      withdraw_money,
      bank_name,
      account_number,
      submission_date,
      approval
    from withdrawal
    `;

    res.json({
      status: "ok",
      data: {
        withdrawal_arr: withdrawal_arr_sql,
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
 * 출금 신청 여부 가져오기
 */
router.post("/is_application_withdrawal", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const is_application_withdrawal_sql = await sql`select
    count(*) from withdrawal
    where user_id = ${verify_access_token.user_id} and approval = false`;

    const message =
      is_application_withdrawal_sql[0].count === "0"
        ? "no_withdrawal"
        : "already_withdrawal";

    res.json({
      status: message,
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
 * 출금 신청
 */
router.post("/application_withdrawal", async (req, res) => {
  try {
    const { withdraw_money, bank_name, account_number, submission_date } =
      req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`insert into withdrawal
      (user_id, withdraw_money, bank_name, account_number, submission_date)
    values
      (${verify_access_token.user_id},
      ${withdraw_money},
      ${bank_name},
      ${account_number},
      ${new Date(submission_date)})`;

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
