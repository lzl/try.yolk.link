import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const data = JSON.parse(req.body);

    await client.query(
      q.Create(q.Collection("logs"), {
        data
      })
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
