import Link from "next/link";

const roles = [
  {
    title: "Landlord",
    description: "I want to list properties",
    icon: (
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 22H5V3H19V22ZM7 20H17V5H7V20ZM11 7H13V9H11V7ZM11 11H13V13H11V11ZM11 15H13V17H11V15Z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    title: "Tenant",
    description: "I'm looking for a home",
    icon: (
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L3 10V12H5V20H10V14H14V20H19V12H21L12 2ZM12 6.5L16.5 10.5H7.5L12 6.5Z"
          fill="white"
        />
      </svg>
    ),
  },
];

export default function CreateAccountPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F5DC] text-[#1A1A1A] font-display antialiased">
      <div className="fixed inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent opacity-70 pointer-events-none" />
      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6">
        <div className="flex w-full max-w-lg items-center gap-3">
          <Link
            href="/"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dcd4c2] bg-white shadow-sm transition hover:bg-white/80"
            aria-label="Back"
          >
            <svg
              className="h-6 w-6 text-[#1A1A1A]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
        <main className="mt-8 flex flex-1 flex-col items-center justify-start px-2 text-center">
          <div className="w-full max-w-lg">
            <h1 className="text-[34px] font-bold leading-tight tracking-tight">
              Create Account
            </h1>
            <p className="mt-3 text-lg font-medium text-[#1A1A1A]/80">
              Select your role to get started with your journey.
            </p>
            <div className="mt-10 flex flex-col gap-5">
              {roles.map((role) => {
                const href =
                  role.title === "Tenant" ? "/tenant-signup" : "/signup/landlord";
                return (
                  <Link
                    key={role.title}
                    href={href}
                    className="group flex w-full items-center justify-between rounded-[2rem] bg-[#0a44b8] px-4 py-3 text-left text-white shadow-[0_8px_30px_-4px_rgba(10,68,184,0.25)] transition hover:bg-[#0b4fc8]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                        {role.icon}
                      </div>
                      <div>
                        <p className="text-xl font-semibold">{role.title}</p>
                        <p className="text-sm font-medium text-white/80">
                          {role.description}
                        </p>
                      </div>
                    </div>
                    <svg
                      className="h-6 w-6 opacity-60 transition group-hover:opacity-100"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                );
              })}
            </div>
            <div className="mt-12 border-t border-[#dcd4c2] pt-6 text-center">
              <p className="text-lg font-medium">
                Already have an account?
                <Link
                  href="/login"
                  className="ml-1 text-[#0a44b8] font-bold underline-offset-4 hover:underline"
                >
                  Log In
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
