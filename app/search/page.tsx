import { Suspense } from "react";

import { SearchResultsScreen } from "@/components/SearchResultsScreen";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsScreen />
    </Suspense>
  );
}
