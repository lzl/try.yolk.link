import { NowRequest, NowResponse } from '@now/node'
import faunadb from 'faunadb'
import nanoid from 'nanoid'
import fetch from 'node-fetch'

// const apiUrl = "http://localhost:5000";
const apiUrl = 'https://rtc.lililulu.cn/api'

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!
    const q = faunadb.query
    const client = new faunadb.Client({ secret })

    const roomName = `try_yolk_link_${nanoid()}`
    const roomConfig = {
      participantLimit: 4,
      inputLimit: 4,
      views: [
        {
          label: 'common',
          video: {
            layout: {
              templates: {
                custom: [
                  {
                    region: [
                      {
                        id: '1',
                        shape: 'rectangle',
                        area: {
                          left: '0',
                          top: '0',
                          width: '1',
                          height: '1',
                        },
                      },
                    ],
                  },
                  {
                    region: [
                      {
                        id: '1',
                        shape: 'rectangle',
                        area: {
                          left: '0',
                          top: '0',
                          width: '1/2',
                          height: '1',
                        },
                      },
                      {
                        id: '2',
                        shape: 'rectangle',
                        area: {
                          left: '1/2',
                          top: '0',
                          width: '1/2',
                          height: '1',
                        },
                      },
                    ],
                  },
                  {
                    region: [
                      {
                        id: '1',
                        shape: 'rectangle',
                        area: {
                          left: '0',
                          top: '0',
                          width: '1/2',
                          height: '1/2',
                        },
                      },
                      {
                        id: '2',
                        shape: 'rectangle',
                        area: {
                          left: '1/2',
                          top: '0',
                          width: '1/2',
                          height: '1/2',
                        },
                      },
                      {
                        id: '3',
                        shape: 'rectangle',
                        area: {
                          left: '0',
                          top: '1/2',
                          width: '1',
                          height: '1/2',
                        },
                      },
                    ],
                  },
                  {
                    region: [
                      {
                        id: '1',
                        shape: 'rectangle',
                        area: {
                          left: '0',
                          top: '0',
                          width: '1/2',
                          height: '1/2',
                        },
                      },
                      {
                        id: '2',
                        shape: 'rectangle',
                        area: {
                          left: '1/2',
                          top: '0',
                          width: '1/2',
                          height: '1/2',
                        },
                      },
                      {
                        id: '3',
                        shape: 'rectangle',
                        area: {
                          left: '0',
                          top: '1/2',
                          width: '1/2',
                          height: '1/2',
                        },
                      },
                      {
                        id: '4',
                        shape: 'rectangle',
                        area: {
                          left: '1/2',
                          top: '1/2',
                          width: '1/2',
                          height: '1/2',
                        },
                      },
                    ],
                  },
                ],
                base: 'fluid',
              },
              fitPolicy: 'letterbox',
            },
            keepActiveInputPrimary: false,
            bgColor: {
              b: 0,
              g: 0,
              r: 0,
            },
            motionFactor: 0.8,
            maxInput: 4,
            parameters: {
              keyFrameInterval: 100,
              framerate: 24,
              resolution: {
                height: 720,
                width: 1280,
              },
            },
            format: {
              codec: 'vp8',
            },
          },
          audio: {
            vad: true,
            format: {
              codec: 'opus',
              sampleRate: 48000,
              channelNum: 2,
            },
          },
        },
      ],
    }

    const result = await fetch(`${apiUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomName, roomConfig }),
    })
    const data = await result.json()
    const { roomKey } = data

    const { roomId } = await client.query(
      q.Let(
        {
          roomId: q.Select(
            ['ref', 'id'],
            q.Create(q.Collection('rooms'), {
              data: {
                name: roomName,
                key: roomKey,
              },
            })
          ),
          now: q.Now(),
          log: q.Create(q.Collection('logs'), {
            data: {
              type: 'room_creation',
              roomId: q.Var('roomId'),
              createdAt: q.ToMillis(q.Var('now')),
              createdDate: q.ToDate(q.Var('now')),
              createdDateString: q.ToString(q.ToDate(q.Var('now'))),
            },
          }),
        },
        {
          roomId: q.Var('roomId'),
        }
      )
    )

    res.status(200).json({ roomId })
  } catch (err) {
    res.status(404).json({ statusCode: 404, message: err.name })
  }
}
