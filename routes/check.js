import express from "express";
import dotenv from "dotenv";

import sql from "../db.js";
import { make_jwt, verify_jwt } from "../libs/common.js";

dotenv.config(); //env 파일 가져오기

const router = express.Router();

/**
 * access token 유효성 검사
 * case1: access token과 refresh token 모두 만료 → 에러 발생 (재 로그인하여 둘다 새로 발급)
 * case2: access token은 만료, refresh token은 유효 →  refresh token을 검증하여 access token 재발급
 * case3: access token은 유효, refresh token은 만료 →  access token을 검증하여 refresh token db저장, access_token재발급,
 * case4: access token과 refresh token 모두가 유효 → refresh token을 검증하여 access token 재발급
 * (클라이언트에서 액세스 토큰 만료 5분전에 요청하기 때문에, 액세스 토큰이 만료되지 않더라도 재발급해서 보내줌)
 * @참고 : https://inpa.tistory.com/entry/WEB-%F0%9F%93%9A-Access-Token-Refresh-Token-%EC%9B%90%EB%A6%AC-feat-JWT
 */
router.post("/token", async (req, res) => {
  const { user_id } = req.body.data;
  const token = req.header("Authorization").replace(/^Bearer\s+/, "");

  const user_initial_info =
    await sql`select user_initial_id from users where id = ${user_id}`;
  const users_info =
    await sql`select refresh_token from user_initial where id = ${user_initial_info[0].user_initial_id}`;

  const verify_access_token = verify_jwt(token);
  const verify_refresh_token = verify_jwt(users_info[0].refresh_token);

  if (verify_access_token === "expired" && verify_refresh_token === "expired") {
    //case1
    res.json({
      status: "token_expired",
    });
  } else if (
    verify_access_token === "expired" &&
    verify_refresh_token !== "expired"
  ) {
    //case2
    const { access_token } = make_jwt(
      verify_refresh_token.user_id,
      verify_refresh_token.platform_id
    );
    res.json({
      status: "ok",
      data: {
        access_token: access_token,
      },
    });
  } else if (
    verify_access_token !== "expired" &&
    verify_refresh_token === "expired"
  ) {
    //case3
    const { access_token, refresh_token } = make_jwt(
      verify_access_token.user_id,
      verify_access_token.platform_id
    );

    await sql`update user_initial set refresh_token=${refresh_token}
    where id = ${user_initial_info[0].id}`;
    res.json({
      status: "ok",
      data: {
        access_token: access_token,
      },
    });
  } else {
    //case4 - verify_access_token !== 'expired' && verify_refresh_token !== 'expired'
    const { access_token } = make_jwt(
      verify_refresh_token.user_id,
      verify_refresh_token.platform_id
    );
    res.json({
      status: "ok",
      data: {
        access_token: access_token,
      },
    });
  }
});

export default router;
