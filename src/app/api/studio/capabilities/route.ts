// Tells the client which generators work WITHOUT a per-user token — i.e. when
// the app owner has set a server-side key. This is the "Higgsfield model":
// the platform holds the key, so visitors just hit Generate.

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    image: !!(process.env.HF_TOKEN || process.env.POLLINATIONS_TOKEN),
    video: !!process.env.HF_TOKEN, // free real-AI video (Hugging Face)
    pro: !!process.env.REPLICATE_API_TOKEN, // Replicate video/audio
  });
}
