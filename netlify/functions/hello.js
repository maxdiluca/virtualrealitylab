export default async () => {
  return new Response(
    JSON.stringify({ ok: true, message: "Function works" }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
};