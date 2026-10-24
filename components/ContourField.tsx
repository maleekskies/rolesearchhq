import { contourPath, mixHex } from '@/lib/contour';

const GROUPS = [
  { x: 760, y: 230, rings: 11, phase: 0 },
  { x: 250, y: 590, rings: 9, phase: 1.4 },
  { x: 540, y: 690, rings: 7, phase: 2.8 },
];

/**
 * The contour field behind the sign-in hero, onboarding, and empty states.
 * Three slow topographies drawn with the same math as the role map.
 */
export default function ContourField({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {GROUPS.map((group, q) =>
        Array.from({ length: group.rings }, (_, index) => {
          const j = group.rings - 1 - index;
          const r = 30 + j * 34;
          const color = mixHex('#E0B45A', '#2F5A45', j / Math.max(1, group.rings - 1));
          return (
            <path
              key={`${q}-${j}`}
              d={contourPath(group.x, group.y, r, group.phase + q * 0.7, 96, 1.18)}
              fill="rgba(227,240,225,.018)"
              stroke={color}
              strokeWidth={1.25}
              opacity={0.9 - (j / group.rings) * 0.58}
            />
          );
        })
      )}
    </svg>
  );
}
