import { useState } from 'react';

export interface MilestoneItem {
  id: string;
  year: string;
  subtitle: string;
  title: string;
  items: string[];
}

export const EDITORIAL_MILESTONES: MilestoneItem[] = [
  {
    id: '2019',
    year: '2019',
    subtitle: 'Early Growth',
    title: 'Early Growth',
    items: [
      'Rolled out new features, including budgeting tools and expense tracking.',
      'Achieved 10,000+ downloads on app stores.',
      'Partnered with educational institutions to promote financial literacy workshops.',
    ],
  },
  {
    id: '2020',
    year: '2020',
    subtitle: 'Scaling Up',
    title: 'Scaling Up',
    items: [
      'Launched Kiddo Account, empowering children with financial knowledge.',
      'Introduced interactive financial education modules for users of all ages.',
      'Reached 50,000+ active users.',
    ],
  },
  {
    id: '2021',
    year: '2021',
    subtitle: 'Community Building',
    title: 'Community Building',
    items: [
      'Introduced the Family Finance Connection feature, enhancing parental control and child education.',
      'Hosted the first virtual financial literacy conference.',
      'Formed partnerships with major financial institutions to offer exclusive benefits.',
      'Crossed 100,000+ active users.',
    ],
  },
];

interface EditorialTimelineProps {
  initialActiveYear?: string;
  className?: string;
  onBack?: () => void;
}

export function EditorialTimeline({
  initialActiveYear = '2020',
  className = '',
  onBack,
}: EditorialTimelineProps) {
  const [activeYear, setActiveYear] = useState<string>(initialActiveYear);

  return (
    <section
      aria-label="Path to Innovation Timeline"
      className={`w-full bg-[#F9F4ED] text-[#2A2A2A] font-poppins selection:bg-[#AF695C]/20 selection:text-[#2A2A2A] py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-12 ${className}`}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {onBack && (
          <div className="w-full flex justify-start mb-8">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium text-[#77716D] hover:text-[#2A2A2A] transition flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#D8D0C8] hover:bg-[#EDEAEA]"
            >
              <span>← Back to Newspaper Studio</span>
            </button>
          </div>
        )}
        {/* Main Headline */}
        <header className="text-center mb-16 sm:mb-20 lg:mb-24 max-w-4xl">
          <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold uppercase text-[#2A2A2A] tracking-[-0.03em] leading-[0.95] sm:leading-[0.92]">
            Path To
            <br />
            Innovation
          </h2>
        </header>

        {/* =========================================================================
            DESKTOP & TABLET HORIZONTAL TIMELINE (md and up)
        ========================================================================= */}
        <div className="hidden md:block w-full">
          {/* Horizontal Track & Milestone Nodes */}
          <div className="relative mb-12 sm:mb-16">
            {/* Horizontal Line connecting nodes across the 3 columns */}
            <div
              className="absolute left-[16.666%] right-[16.666%] top-[34px] h-[2px] bg-[#D8D0C8] -translate-y-1/2 z-0"
              aria-hidden="true"
            />

            {/* 3-Column Node Bar */}
            <div className="grid grid-cols-3 gap-6 lg:gap-8 relative z-10" role="tablist" aria-label="Milestones">
              {EDITORIAL_MILESTONES.map((m) => {
                const isActive = activeYear === m.year;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    id={`tab-${m.year}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${m.year}`}
                    onClick={() => setActiveYear(m.year)}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AF695C] rounded-xl py-1 transition-transform"
                  >
                    {/* Year Label */}
                    <span
                      className={`text-base sm:text-lg font-semibold tracking-tight transition-colors duration-250 mb-3 ${
                        isActive
                          ? 'text-[#AF695C] font-bold'
                          : 'text-[#77716D] group-hover:text-[#2A2A2A]'
                      }`}
                    >
                      {m.year}
                    </span>

                    {/* Timeline Node Dot */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'bg-[#AF695C] ring-4 ring-[#AF695C]/20 scale-110 shadow-sm'
                          : 'bg-[#EDEAEA] border-2 border-[#D8D0C8] group-hover:border-[#AF695C] group-hover:bg-[#F9F4ED]'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-[#F9F4ED]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid: 3 cards aligned beneath each timeline node */}
          <div className="grid grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {EDITORIAL_MILESTONES.map((m) => {
              const isActive = activeYear === m.year;
              return (
                <div
                  key={m.id}
                  id={`panel-${m.year}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${m.year}`}
                  tabIndex={0}
                  onClick={() => setActiveYear(m.year)}
                  className={`rounded-[28px] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AF695C] ${
                    isActive
                      ? 'bg-[#F9F4ED] border-2 border-[#AF695C] shadow-sm transform -translate-y-1'
                      : 'bg-[#EDEAEA] border border-[#D8D0C8]/60 hover:border-[#D8D0C8] hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Card Header: Year Sub-label and Title */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs uppercase font-semibold tracking-wider ${
                            isActive ? 'text-[#AF695C]' : 'text-[#77716D]'
                          }`}
                        >
                          Milestone · {m.year}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#AF695C]/10 text-[#AF695C]">
                            Active
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-2xl lg:text-3xl font-semibold tracking-tight ${
                          isActive ? 'text-[#2A2A2A] font-bold' : 'text-[#2A2A2A]'
                        }`}
                      >
                        {m.title}
                      </h3>
                    </div>

                    {/* Description Items with thin separators */}
                    <ul className="divide-y divide-[#D8D0C8] list-none p-0 m-0">
                      {m.items.map((item, idx) => (
                        <li
                          key={idx}
                          className={`py-4 text-sm sm:text-base leading-relaxed ${
                            isActive
                              ? 'text-[#2A2A2A]'
                              : 'text-[#77716D]'
                          }`}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            MOBILE VERTICAL TIMELINE (under md)
        ========================================================================= */}
        <div className="block md:hidden w-full relative pl-8" role="tablist" aria-label="Mobile Milestones">
          {/* Vertical Connecting Line */}
          <div
            className="absolute left-3 top-4 bottom-8 w-[2px] bg-[#D8D0C8] -translate-x-1/2 z-0"
            aria-hidden="true"
          />

          <div className="space-y-8 relative z-10">
            {EDITORIAL_MILESTONES.map((m) => {
              const isActive = activeYear === m.year;
              return (
                <div key={m.id} className="relative group">
                  {/* Vertical Node & Year Label Button */}
                  <button
                    type="button"
                    role="tab"
                    id={`mobile-tab-${m.year}`}
                    aria-selected={isActive}
                    aria-controls={`mobile-panel-${m.year}`}
                    onClick={() => setActiveYear(m.year)}
                    className="absolute -left-8 top-6 -translate-y-1/2 flex items-center justify-center focus:outline-none"
                    aria-label={`Select ${m.year} ${m.title}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'bg-[#AF695C] ring-4 ring-[#AF695C]/20 scale-110 shadow-sm'
                          : 'bg-[#EDEAEA] border-2 border-[#D8D0C8]'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-[#F9F4ED]" />}
                    </div>
                  </button>

                  {/* Milestone Card */}
                  <div
                    id={`mobile-panel-${m.year}`}
                    role="tabpanel"
                    aria-labelledby={`mobile-tab-${m.year}`}
                    tabIndex={0}
                    onClick={() => setActiveYear(m.year)}
                    className={`rounded-[24px] p-6 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AF695C] ${
                      isActive
                        ? 'bg-[#F9F4ED] border-2 border-[#AF695C] shadow-sm'
                        : 'bg-[#EDEAEA] border border-[#D8D0C8]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider ${
                          isActive ? 'text-[#AF695C]' : 'text-[#77716D]'
                        }`}
                      >
                        {m.year} · {m.subtitle}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#AF695C]/10 text-[#AF695C]">
                          Active
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-[#2A2A2A] tracking-tight mb-4">
                      {m.title}
                    </h3>

                    <ul className="divide-y divide-[#D8D0C8] list-none p-0 m-0">
                      {m.items.map((item, idx) => (
                        <li
                          key={idx}
                          className={`py-3 text-sm leading-relaxed ${
                            isActive ? 'text-[#2A2A2A]' : 'text-[#77716D]'
                          }`}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
