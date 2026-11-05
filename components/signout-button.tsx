'use client';

export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post" className="contents">
      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-100 sm:w-auto"
      >
        Sign out
      </button>
    </form>
  );
}
