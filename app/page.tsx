/**
 * app/page.tsx
 *
 * Home page: renders the single main app component that handles the full
 * flow (upload → detect → verify → figures → generate PDF).
 */

import { MathExtractApp } from "@/components/MathExtractApp";

export default function Home() {
  return <MathExtractApp />;
}
