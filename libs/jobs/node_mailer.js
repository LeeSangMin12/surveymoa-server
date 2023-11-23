import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();  //env 파일 가져오기

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

export const set_node_mailer = async ({
  sender_email,
  reciver_email,
  title,
  description,
  file_list,
  google_access_token,
  google_refresh_token,
  google_token_expires
}) => {

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: sender_email,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      accessToken: google_access_token,
      refreshToken: google_refresh_token,
      expires: google_token_expires,
    },
  });

  const make_file_list = file_list.map((val) => ({
    filename: val.name,
    path: val.uri
  }));

  const message = {
    from: sender_email,
    to: reciver_email,
    subject: title,
    text: description,
    textEncoding: 'base64',
    attachments: make_file_list
  };

  try {
    transporter.sendMail(message);
  } catch (e) {
    console.log(e);
  }
};