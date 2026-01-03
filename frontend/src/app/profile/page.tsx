"use client";

const preferences = [
  { label: "Employed", active: true },
  { label: "Self-Employed" },
  { label: "Student" },
  { label: "Unemployed" },
];

const maritalStatus = [
  { label: "Single" },
  { label: "Married", active: true },
  { label: "Divorced" },
  { label: "Widowed" },
];

const vehicles = [
  { label: "Yes", active: true },
  { label: "No" },
  { label: "Any" },
];

const smoking = [
  { label: "Yes" },
  { label: "No", active: true },
  { label: "Occasionally" },
  { label: "Socially" },
];

const drinking = [
  { label: "Yes" },
  { label: "No" },
  { label: "Occasionally", active: true },
  { label: "Socially" },
];

const religion = [
  { label: "No Preference" },
  { label: "Muslim", active: true },
  { label: "Christian" },
  { label: "Other" },
];

const education = [
  { label: "High School" },
  { label: "Bachelors", active: true },
  { label: "Masters" },
  { label: "PHD" },
];

const socialHabits = [
  { label: "Rarely" },
  { label: "Occasionally", active: true },
  { label: "Often" },
];

const apartmentChecks = [
  { label: "Pets Allowed", description: "Cats, dogs, etc.", active: true },
  { label: "Non-owner-occupied", description: "Landlord lives off-site" },
  { label: "Shared Apartment", description: "Unit shared with others" },
  { label: "Shortlet", description: "Short-term stays allowed" },
  { label: "Self Compound", description: "Private compound access" },
  { label: "Shared Compound", description: "Compound shared with others" },
];

export default function ProfilePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light text-slate-900 dark:bg-background-dark dark:text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-background-light px-4 py-3 dark:border-slate-800 dark:bg-background-dark">
        <button
          aria-label="Go back"
          className="rounded-full p-2 text-primary transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-[28px]">arrow_back</span>
        </button>

        <h2 className="flex-1 text-center text-2xl font-bold tracking-tight text-primary dark:text-white">
          My Profile
        </h2>

        <button className="text-right text-primary font-bold tracking-tight dark:text-slate-300">
          Logout
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
        <section className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="h-32 w-32 rounded-full border-4 border-white bg-cover bg-center shadow-lg dark:border-slate-700"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCx6DzMNOzrYCXX4YWcckEWTfaCn19D0_qoed1dl1Curkg6F6_abZMP-Fkks-2jNdJQDQKSjndOSwj1bst8t-IvK6BtQACV3RgFMJob8FIAlMa4rrtHC3-S_HnYCKLlgvE0yCWIezjLP33utbei9KW4Dym6Py3HRxziATGkK0nJ7jQA695G1T4PyoKSQ0AutCOUuFhGhPNOh_vFgpYIDxb9iAns66XAR8yUGIqaeTxCUmmzpF_a4OgfwDa8hsP21nEciC__k3wmOHBq')",
              }}
            />
            <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md">
              <span className="material-symbols-outlined text-lg">edit</span>
            </div>
          </div>
          <p className="text-xl font-bold text-primary dark:text-white">Edit Photo</p>
        </section>

        <section className="mt-6 space-y-5">
          {[
            { label: "Full Name", icon: "person", value: "Sarah Jenkins" },
            { label: "Email", icon: "mail", value: "sarah.jenkins@example.com" },
            { label: "Phone Number", icon: "phone", value: "+1 (555) 123-4567" },
          ].map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-lg font-bold text-primary dark:text-slate-200">
                {field.label}
              </label>
              <div className="flex items-center gap-3 rounded-full border-2 border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="material-symbols-outlined text-slate-400 text-[24px]">
                  {field.icon}
                </span>
                <input
                  className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400 dark:text-white"
                  type={field.icon === "mail" ? "email" : field.icon === "phone" ? "tel" : "text"}
                  value={field.value}
                  readOnly
                />
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-6">
          <h3 className="text-2xl font-bold text-primary dark:text-white">Preferences</h3>
          {[preferences, maritalStatus, vehicles, smoking, drinking, religion, education, socialHabits].map(
            (group, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-bold text-primary dark:text-slate-200">
                  <span className="material-symbols-outlined">star</span>
                  <p>{group[0]?.label}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.map((item) => (
                    <button
                      key={item.label}
                      className={`rounded-full px-4 py-2 text-base font-semibold transition-colors ${
                        item.active
                          ? "border-2 border-primary bg-blue-50 text-primary"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </section>

        <section className="mt-8 space-y-5">
          <h3 className="text-2xl font-bold text-primary dark:text-white">Annual Earnings</h3>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 dark:text-white">Total Yearly Income</span>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xl font-bold text-primary dark:bg-slate-700">
                $85,000
              </span>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min={0}
                max={300000}
                step={5000}
                value={85000}
                className="w-full accent-primary"
                readOnly
              />
              <div className="mt-2 flex justify-between text-sm text-slate-400 font-medium">
                <span>$0</span>
                <span>$150k</span>
                <span>$300k+</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h3 className="text-2xl font-bold text-primary dark:text-white">Apartment Preference</h3>
          {apartmentChecks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{check.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{check.description}</p>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  defaultChecked={!!check.active}
                  readOnly
                />
                <span className="inline-flex h-8 w-14 items-center rounded-full bg-gray-200 transition peer-checked:bg-primary dark:bg-slate-700">
                  <span className="ml-1 h-7 w-7 rounded-full bg-white transition peer-checked:translate-x-6 peer-checked:border-primary" />
                </span>
              </label>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 dark:text-white">Max Commute Radius</span>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xl font-bold text-primary dark:bg-slate-700">
                15 mi
              </span>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min={0}
                max={50}
                value={15}
                className="w-full accent-primary"
                readOnly
              />
              <div className="mt-2 flex justify-between text-sm text-slate-400 font-medium">
                <span>0 mi</span>
                <span>25 mi</span>
                <span>50 mi</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-background-light/95 px-4 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-background-dark/95">
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95">
          <span className="material-symbols-outlined">save</span>
          Save Profile
        </button>
      </footer>
    </div>
  );
}
