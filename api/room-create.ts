import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";
import nanoid from "nanoid";
import fetch from "node-fetch";

// const apiUrl = "http://localhost:5000";
const apiUrl = "https://rtc.lililulu.cn/api";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const roomName = `try_yolk_link_${nanoid()}`;

    const result = await fetch(`${apiUrl}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ roomName })
    });
    const data = await result.json();
    const { roomKey } = data;

    const room: any = await client.query(
      q.Create(q.Collection("rooms"), {
        data: {
          name: roomName,
          key: roomKey
        }
      })
    );
    const roomRef = JSON.stringify(room.ref);

    res.status(200).json({ roomRef });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
