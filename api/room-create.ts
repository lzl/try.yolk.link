import { NowRequest, NowResponse } from "@now/node";
import faunadb from "faunadb";
import nanoid from "nanoid";

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const secret = process.env.FAUNADB_SECRET_KEY!;
    const q = faunadb.query;
    const client = new faunadb.Client({ secret });

    const roomKey = nanoid();
    console.log("[SERVER] roomId:", roomKey);

    const room: any = await client.query(
      q.Create(q.Collection("rooms"), {
        data: {
          roomKey
        }
      })
    );

    const roomRef = JSON.stringify(room.ref);

    res.status(200).json({ roomRef });
  } catch (err) {
    console.log(err);
    res.status(404).json({ statusCode: 404, message: err.message });
  }
};
