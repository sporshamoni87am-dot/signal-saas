'use client';

export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-100"
      >
        Sign out
      </button>
    </form>
  );
}
