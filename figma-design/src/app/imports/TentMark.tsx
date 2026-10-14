import svgPaths from "../../imports/svg-paths";

/** Tent glyph used on the sign-in card and the empty states. */
export default function TentMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={svgPaths.tentOuter} />
      <path d={svgPaths.tentPole} />
      <path d={svgPaths.tentDoor} />
    </svg>
  );
}
