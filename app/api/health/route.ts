export async function GET() {
  return Response.json({
    status: "ok",
    service: "baseline-app",
    timestamp: new Date().toISOString(),
  });
}
