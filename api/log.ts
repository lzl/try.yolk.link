import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const data = JSON.parse(req.body);

    await client.query(
      q.Let(
        {
          now: q.Now(),
          createdAt: q.ToMillis(q.Var("now")),
          createdDate: q.ToDate(q.Var("now")),
          createdDateString: q.ToString(q.Var("createdDate"))
        },
        {
          result: q.Create(q.Collection("logs"), {
            data: q.Merge(data, {
              createdAt: q.Var("createdAt"),
              createdDate: q.Var("createdDate"),
              createdDateString: q.Var("createdDateString")
            })
          })
        }
      )
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
