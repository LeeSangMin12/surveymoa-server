import express from "express";

import sql from "../db.js";
import { verify_jwt } from "../libs/common.js";

const router = express.Router();

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

/**
 * 출금 내역 조회
 */
router.post("/get_withdrawal_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const withdrawal_arr_sql = await sql`select
      id, 
      user_id,
      withdraw_money,
      bank_name,
      account_number,
      submission_date,
      approval,
      approve_date
    from withdrawal
    where  ${user_id === "" ? sql`TRUE` : sql`user_id = ${user_id}`}`;

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
 * 출금 승인
 */
router.post("/approve", async (req, res) => {
  try {
    const { withdrawal_id, approve_date } = req.body.data;

    await sql`update withdrawal 
    set approval = ${true},
        approve_date = ${new Date(approve_date)}
    where id = ${withdrawal_id}`;

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
 * 출금 승인 취소
 */
router.post("/unapprove", async (req, res) => {
  try {
    const { withdrawal_id, approve_date } = req.body.data;

    await sql`update withdrawal 
    set approval = ${false},
        approve_date = ${new Date(approve_date)}
    where id = ${withdrawal_id}`;

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
