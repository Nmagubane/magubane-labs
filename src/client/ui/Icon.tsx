/** A small, consistent line-icon set (24px grid, 1.75 stroke). Drawn for this product. */
const PATHS: Record<string, string> = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  learn: 'M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5',
  practice: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z',
  tests: 'M8 4h8M9 2.75h6a1 1 0 0 1 1 1V5H8V3.75a1 1 0 0 1 1-1zM6 4.5h12a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1zM8.5 11l1.5 1.5L13 9.5M8.5 16.5h7',
  tutor: 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8.5 9.5h7M8.5 12.5h4.5',
  progress: 'M4 20h16M6.5 16.5V12M11 16.5V8M15.5 16.5v-6M20 16.5V5',
  exam: 'M5 4.5h14a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1zM4 9h16M8.5 3v3M15.5 3v3M8 13h3M8 16.5h3M14 13h2',
  check: 'M5 12.5 10 17 19 7',
  cross: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  hint: 'M9.5 18h5M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  back: 'M14.5 6 8.5 12l6 6',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  retry: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4',
  send: 'M5 12h13M13 6.5 18.5 12 13 17.5',
  stop: 'M7 7h10v10H7z',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  flag: 'M5 21V4M5 4.5h11l-2 3.5 2 3.5H5',
  lock: 'M6.5 10.5h11a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
  trash: 'M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.9-3.3 3.4-5 6.5-5s5.6 1.7 6.5 5M16 11a3 3 0 1 0 0-6M17.5 15c2 .4 3.5 1.9 4 5',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  mail: 'M4 6h16v12H4zM4.5 6.5 12 13l7.5-6.5',
  present: 'M3.5 4.5h17v11h-17zM12 15.5V20M8 20h8',
  report: 'M6 3h9l4 4v14H6zM14.5 3v4.5H19M9 12h7M9 15.5h7M9 9h3',
  next: 'M9.5 6l6 6-6 6',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
