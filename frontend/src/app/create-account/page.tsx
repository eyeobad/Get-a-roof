import Link from "next/link";
import { MdHomeWork, MdPerson } from "react-icons/md";

const roles = [
  {
    title: "Landlord",
    description: "I want to list properties",
    icon: <MdHomeWork size={24} color="white" />,
  },
  {
    title: "Tenant",
    description: "I'm looking for a home",
    icon: <MdPerson size={24} color="white" />,
  },
];


export default function CreateAccountPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#1A1A1A] font-display antialiased">
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8fbff] via-white to-white opacity-80 pointer-events-none" />
      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6">
        <div className="flex w-full max-w-lg items-center gap-3">
          <Link
            href="/"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dbe4f5] bg-white shadow-sm transition hover:bg-[#f7faff]"
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
                  role.title === "Tenant" ? "/tenant-signup" : "/landlord-signup";
                return (
                  <Link
                    key={role.title}
                    href={href}
                    className="group flex w-full items-center justify-between rounded-[2rem] border border-[#dbe4f5] bg-white px-4 py-3 text-left text-[#0c141d] shadow-[0_8px_24px_-10px_rgba(12,20,29,0.18)] transition hover:border-[#9cb9ec] hover:shadow-[0_12px_30px_-12px_rgba(10,68,184,0.28)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0a44b8]">
                        {role.icon}
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-[#0c141d]">{role.title}</p>
                        <p className="text-sm font-medium text-[#4a5d78]">
                          {role.description}
                        </p>
                      </div>
                    </div>
                    <svg
                      className="h-6 w-6 text-[#0a44b8] opacity-60 transition group-hover:opacity-100"
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
            <div className="mt-12 border-t border-[#dbe4f5] pt-6 text-center">
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
