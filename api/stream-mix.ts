import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";
import fetch from "node-fetch";

// const apiUrl = "http://localhost:5000";
const apiUrl = "https://rtc.lililulu.cn/api";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const { roomId, streamId } = JSON.parse(req.body);
    const key = await client.query(
      q.Select(["data", "key"], q.Get(q.Ref(q.Collection("rooms"), roomId)))
    );

    await fetch(`${apiUrl}/mix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ roomId: key, streamId })
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
