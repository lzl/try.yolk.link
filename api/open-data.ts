import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const data = await client.query(
      q.Let(
        {
          date: "2019-12-18",
          roomId: "251514846315545088"
        },
        {
          data: {
            room_creation_all_count: q.Count(
              q.Match(q.Index("logs_by_type"), ["room_creation"])
            ),
            room_creation_day_count: q.Count(
              q.Match(q.Index("logs_by_type_and_createdDateString"), [
                "room_creation",
                q.Var("date")
              ])
            ),
            room_joined_day_count: q.Count(
              q.Match(q.Index("logs_by_type_and_createdDateString"), [
                "room_duration",
                q.Var("date")
              ])
            ),
            room_joined_roomId_count: q.Count(
              q.Match(q.Index("logs_by_type_and_roomId"), [
                "room_duration",
                q.Var("roomId")
              ])
            ),
            room_duration_day_sum: q.Sum(
              q.Map(
                q.Paginate(
                  q.Match(q.Index("logs_by_type_and_createdDateString"), [
                    "room_duration",
                    q.Var("date")
                  ])
                ),
                q.Lambda("X", q.Select(["data", "duration"], q.Get(q.Var("X"))))
              )
            ),
            room_duration_roomId_sum: q.Sum(
              q.Map(
                q.Paginate(
                  q.Match(q.Index("logs_by_type_and_roomId"), [
                    "room_duration",
                    q.Var("roomId")
                  ])
                ),
                q.Lambda("X", q.Select(["data", "duration"], q.Get(q.Var("X"))))
              )
            )
          }
        }
      )
    );

    res.status(200).json(data);
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
