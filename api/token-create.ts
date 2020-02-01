import { NowRequest, NowResponse } from '@now/node'
import faunadb from 'faunadb'
import fetch from 'node-fetch'

// const apiUrl = "http://localhost:5000";
const apiUrl = process.env.OWT_API_URL

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!
    const q = faunadb.query
    const client = new faunadb.Client({ secret })

    const { roomId, userName } = JSON.parse(req.body)
    const key: any = await client.query(
      q.Select(['data', 'key'], q.Get(q.Ref(q.Collection('rooms'), roomId)))
    )

    const result = await fetch(`${apiUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId: key, userName }),
    })
    const data = await result.json()

    if (data.error) {
      throw new Error(`${data.error.message} (${data.error.code})`)
    }

    res.status(200).json({ token: data.token })
  } catch (err) {
    res
      .status(404)
      .json({ statusCode: 404, name: err.name, message: err.message })
  }
}
