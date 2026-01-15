"use client";

import Link from "next/link";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

function EditBtn({ href }: { href?: string }) {
  const cls =
    "inline-flex items-center gap-1 text-[#0a44b8] text-[14px] font-semibold hover:opacity-80";
  return href ? (
    <Link href={href} className={cls}>
      Edit
      <span className="material-symbols-outlined text-[18px]" style={solidIconStyle}>
        edit
      </span>
    </Link>
  ) : (
    <button type="button" className={cls}>
      Edit
      <span className="material-symbols-outlined text-[18px]" style={solidIconStyle}>
        edit
      </span>
    </button>
  );
}

function SectionTitle({
  title,
  editHref,
}: {
  title: string;
  editHref?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h2>
      <EditBtn href={editHref} />
    </div>
  );
}

function MiniChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] text-[#1A1A1A] shadow-sm">
      <span
        className="material-symbols-outlined text-[18px] text-black/55"
        style={solidIconStyle}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default function ReviewPublishPage() {
  return (
    <div className="min-h-screen bg-white/95 font-display text-[#1A1A1A] antialiased">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col bg-white/95 pb-36">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-black/5">
          <div className="px-4 py-4 flex items-center justify-between">
            <Link
              href="/add-property-preferences"
              aria-label="Go back"
              className="p-2 -ml-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={solidIconStyle}
              >
                arrow_back
              </span>
            </Link>

       
            <div className="w-10" />
          </div>
        </header>


        {/* Content */}
        <main className="px-5 pt-5 space-y-6">
          <div className="space-y-2">
            <div className="text-[#0a44b8] text-[13px] font-bold tracking-[0.18em] uppercase">
              STEP 5 OF 5
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Review &amp; Publish
            </h1>
            <p className="text-[13px] text-black/60 leading-relaxed max-w-[320px]">
              Please review your listing details below. You can edit any section
              before publishing.
            </p>
          </div>

          {/* Property Photos */}
          <section className="space-y-3">
            <SectionTitle title="Property Photos" editHref="/add-property-photos" />
            <div className="flex gap-4 overflow-x-auto pb-2 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Cover */}
              <div className="shrink-0">
                <div className="relative w-[210px] h-[132px] rounded-2xl overflow-hidden bg-black/10">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjuF3xgiher5Wod-710qDd3xB1y2v8iCki0oJSiwVIDE3ZtMRuGhCnb8ju1CZHyRReziTslravvwlKv4kSXZr3QrX-Hjdkdf7rfaa_o_ocWqwruS6Tt1lBGXMrToSh4DP4c_2bL09KlfExuwlSRn6b4PAdr_yB5lYkkBJU_1ko5oq0rkdeqfijcuJCMGqLZ9pmMGRo-IVoKjA4g1nB7aKcQs7R4t5CsuiP33RdAvZkrk9Z9b8KRwMbhjxXfnQlL42GNtgD9Jelnsa1"
                    alt="Living Room"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 text-[11px] font-semibold text-white bg-black/55 backdrop-blur px-2 py-1 rounded-full">
                    Cover Photo
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium">Living Room</p>
              </div>

              <div className="shrink-0">
                <div className="relative w-[210px] h-[132px] rounded-2xl overflow-hidden bg-black/10">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_Oz3LVTvmcH-aZn43JKGNHjaGGGHq41ghywVZSRVX_qP0jAtqhuor2bllXgFgTKgFAx_yvkrFJ5zMMcblQ-Nk46INIiErf-YkV8IEEXdP96zu6WD0r5JdPz_pgaDugQTkJ0fXFldcHPe2CXSP5_Y2Co7qN_0sH5t9XzfMSMI7yp3WdrkSF_9Z2C1ykUs5g-nvHCCOrhW4O3mB7i5GBGibYBqqgEuFBqL8lVwkoudoBf98S72412ULwPWAWY9VIjEmZDve4bmecD8k"
                    alt="Kitchen"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="mt-2 text-[13px] font-medium">Kitchen</p>
              </div>
            </div>
          </section>

          {/* The Basics */}
          <section className="space-y-3">
            <SectionTitle title="The Basics" editHref="/add-property-details" />

            <div className="rounded-3xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="p-5 space-y-5">
                {/* Type */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#0a44b8]"
                      style={solidIconStyle}
                    >
                      apartment
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Type of Property
                    </div>
                    <div className="text-[15px] font-semibold mt-1">Apartment</div>
                  </div>
                </div>

                {/* Rent */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF8EF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#1f8b4c]"
                      style={solidIconStyle}
                    >
                      payments
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Monthly Rent
                    </div>
                    <div className="text-[15px] font-semibold mt-1">
                      $2,500{" "}
                      <span className="text-[13px] font-medium text-black/45">
                        /month
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#0a44b8]"
                      style={solidIconStyle}
                    >
                      location_on
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Property Address
                    </div>
                    <div className="text-[13px] font-semibold mt-1">
                      123 Maple Avenue, Apt 4B
                    </div>
                    <div className="text-[13px] text-black/60">
                      Springfield, IL 62704
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-black/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#0a44b8]"
                      style={solidIconStyle}
                    >
                      description
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Description
                    </div>
                    <p className="text-[13px] text-black/70 leading-relaxed mt-2">
                      Charming 2-bedroom apartment with natural light, hardwood
                      floors, and modern appliances. Located in a quiet
                      neighborhood close to parks and public transport...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Requirements */}
          <section className="space-y-3">
            <SectionTitle title="Requirements" editHref="/add-property-requirements" />
            <div className="rounded-3xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    credit_score
                  </span>
                  <span className="text-[13px] font-medium">Credit Score</span>
                </div>
                <span className="text-[13px] font-semibold">700+</span>
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    pets
                  </span>
                  <span className="text-[13px] font-medium">Pets Policy</span>
                </div>
                <span className="text-[13px] font-semibold">Cats Only</span>
              </div>

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    smoke_free
                  </span>
                  <span className="text-[13px] font-medium">Smoking</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FFE7E7] text-[#C62828] text-[12px] font-semibold">
                  Strictly No
                </span>
              </div>
            </div>
          </section>

          {/* Ideal Tenant Match */}
          <section className="space-y-3 pb-2">
            <SectionTitle title="Ideal Tenant Match" editHref="/add-property-preferences" />
            <div className="rounded-3xl bg-white border border-black/5 shadow-sm p-5 space-y-4">
              <p className="text-[12px] text-black/50">
                These preferences help us find the best matches.
              </p>

              <div className="flex flex-col gap-3">
                <MiniChip icon="work" label="Full-time Employed" />
                <MiniChip icon="volume_off" label="Quiet Lifestyle" />
                <MiniChip icon="school" label="Student Friendly" />
                <MiniChip icon="directions_car" label="Has Vehicle" />
              </div>
            </div>
          </section>
        </main>

        {/* Bottom publish bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-black/5">
          <div className="px-5 pt-3 pb-7">
            <div className="flex items-center justify-between text-[12px] mb-3">
              <div className="text-black/55">
                Posting as <span className="font-semibold text-black/85">John Doe</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[#0a44b8] font-semibold"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={solidIconStyle}
                >
                  visibility
                </span>
                Preview
              </button>
            </div>

            <Link
              href="/dashboard/properties"
              className="w-full h-14 rounded-full bg-[#0a44b8] text-white font-bold text-[15px] shadow-lg shadow-[#0a44b8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Publish Property</span>
              <span
                className="material-symbols-outlined text-[20px]"
                style={solidIconStyle}
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
