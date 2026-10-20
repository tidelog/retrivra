import { allow } from "@/server/rate-limit";
import { z } from "zod";
import { NextResponse } from "next/server";
import { endpoint, owner, sameOrigin, HttpError, limitedJson } from "@/server/http";
import { retrieve } from "@/server/retrieval";
import { answerProvider } from "@/server/ai";
export const POST = endpoint(async request => {
 const ownerId = await owner(); sameOrigin(request);
 if (Number(request.headers.get("content-length")) > 16000) throw new HttpError(413, "Request too large");
 const { query, answer } = z.object({ query: z.string().trim().min(2).max(2000), answer: z.boolean().default(false) }).parse(await limitedJson(request));
 if (!await allow("search:" + ownerId, 30, 60)) throw new HttpError(429, "Search rate limit exceeded");
 const sources = await retrieve(ownerId, query);
 const result = answer ? sources.length ? await answerProvider().answer({ question: query, sources }) : { text: "Insufficient evidence. Upload and process relevant documents first.", citedChunkIds: [] } : null;
 return NextResponse.json({ sources, answer: result, evidenceNotice: "Sources are original evidence. Generated answers may contain errors; verify against the cited passages." });
});
