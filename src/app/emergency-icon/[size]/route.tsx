import { ImageResponse } from "next/og";

const VALID = new Set([120, 152, 167, 180, 192, 384, 512]);

export async function GET(_req: Request, { params }: { params: { size: string } }) {
  const size = Number(params.size);
  if (!VALID.has(size)) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
        }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L1 21h22L12 2zm0 4.83L19.17 19H4.83L12 6.83zM11 10h2v5h-2zm0 6h2v2h-2z" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/png",
      },
    }
  );
}
