import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";
import fetch from "node-fetch";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const { roomId } = JSON.parse(req.body);
    const room: any = await client.query(
      q.Get(q.Ref(q.Collection("rooms"), roomId))
    );

    const result = await fetch("https://rtc.lililulu.cn/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ roomId: room.data.key })
    });
    const data = await result.json();

    res.status(200).json({ token: data.token });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
