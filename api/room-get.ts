import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const { roomId } = JSON.parse(req.body);
    const room: any = await client.query(
      q.Get(q.Ref(q.Collection("rooms"), roomId))
    );

    res.status(200).json({ roomKey: room.data.roomKey });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
