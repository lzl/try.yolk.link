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
              q.Match(q.Index("logs_by_type_to_count"), ["room_creation"])
            ),
            room_creation_day_count: q.Count(
              q.Match(q.Index("logs_by_type_and_createdDateString_to_count"), [
                "room_creation",
                q.Var("date")
              ])
            ),
            room_joined_day_count: q.Count(
              q.Match(q.Index("logs_by_type_and_createdDateString_to_count"), [
                "room_joined",
                q.Var("date")
              ])
            ),
            room_left_day_count: q.Count(
              q.Match(q.Index("logs_by_type_and_createdDateString_to_count"), [
                "room_duration",
                q.Var("date")
              ])
            ),
            room_joined_roomId_count: q.Count(
              q.Match(q.Index("logs_by_type_and_roomId_to_count"), [
                "room_joined",
                q.Var("roomId")
              ])
            ),
            room_duration_day_sum: q.Sum(
              q.Select(
                ["data"],
                q.Paginate(
                  q.Match(
                    q.Index(
                      "logs_by_type_and_createdDateString_return_duration"
                    ),
                    ["room_duration", q.Var("date")]
                  )
                )
              )
            ),
            room_duration_roomId_sum: q.Sum(
              q.Select(
                ["data"],
                q.Paginate(
                  q.Match(q.Index("logs_by_type_and_roomId_return_duration"), [
                    "room_duration",
                    q.Var("roomId")
                  ])
                )
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
