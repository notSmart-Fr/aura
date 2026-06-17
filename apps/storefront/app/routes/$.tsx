import { json } from "@remix-run/node";

export const loader = () => {
  return json({ error: "Not Found" }, { status: 404 });
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900 font-sans">
      <div className="text-center">
        <h1 className="text-2xl font-light tracking-wider mb-2">404</h1>
        <p className="text-xs text-zinc-500 tracking-widest uppercase">Page Not Found</p>
      </div>
    </div>
  );
}
