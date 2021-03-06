import { NowRequest, NowResponse } from '@now/node'
import faunadb from 'faunadb'

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!
    const q = faunadb.query
    const client = new faunadb.Client({ secret })

    const data = await client.query(
      q.Let(
        {
          date: q.ToString(q.ToDate(q.Now())),
          // roomId: "251514846315545088"
        },
        {
          data: {
            room_creation_all_count: q.Count(
              q.Match(q.Index('logs_by_type_to_count'), ['room_creation'])
            ),
            room_visited_all_count: q.Count(
              q.Match(q.Index('logs_by_type_to_count'), ['room_visited'])
            ),
            room_joined_all_count: q.Count(
              q.Match(q.Index('logs_by_type_to_count'), ['room_joined'])
            ),
            room_left_all_count: q.Count(
              q.Match(q.Index('logs_by_type_to_count'), ['room_duration'])
            ),
            room_interval_all_count: q.Count(
              q.Match(q.Index('logs_by_type_to_count'), ['room_interval'])
            ),
            room_duration_all_sum: q.Sum(
              q.Select(
                ['data'],
                q.Paginate(
                  q.Match(q.Index('logs_by_type_return_duration'), [
                    'room_duration',
                  ])
                )
              )
            ),
            room_creation_today_count: q.Count(
              q.Match(q.Index('logs_by_type_and_createdDateString_to_count'), [
                'room_creation',
                q.Var('date'),
              ])
            ),
            room_visited_today_count: q.Count(
              q.Match(q.Index('logs_by_type_and_createdDateString_to_count'), [
                'room_visited',
                q.Var('date'),
              ])
            ),
            room_joined_today_count: q.Count(
              q.Match(q.Index('logs_by_type_and_createdDateString_to_count'), [
                'room_joined',
                q.Var('date'),
              ])
            ),
            room_left_today_count: q.Count(
              q.Match(q.Index('logs_by_type_and_createdDateString_to_count'), [
                'room_duration',
                q.Var('date'),
              ])
            ),
            room_interval_today_count: q.Count(
              q.Match(q.Index('logs_by_type_and_createdDateString_to_count'), [
                'room_interval',
                q.Var('date'),
              ])
            ),
            // room_joined_roomId_count: q.Count(
            //   q.Match(q.Index("logs_by_type_and_roomId_to_count"), [
            //     "room_joined",
            //     q.Var("roomId")
            //   ])
            // ),
            room_duration_today_sum: q.Sum(
              q.Select(
                ['data'],
                q.Paginate(
                  q.Match(
                    q.Index(
                      'logs_by_type_and_createdDateString_return_duration'
                    ),
                    ['room_duration', q.Var('date')]
                  )
                )
              )
            ),
            // room_duration_roomId_sum: q.Sum(
            //   q.Select(
            //     ["data"],
            //     q.Paginate(
            //       q.Match(q.Index("logs_by_type_and_roomId_return_duration"), [
            //         "room_duration",
            //         q.Var("roomId")
            //       ])
            //     )
            //   )
            // )
          },
        }
      )
    )

    res.status(200).json(data)
  } catch (err) {
    console.log(err)
    res.status(404).json({ statusCode: 404, message: err.message })
  }
}
