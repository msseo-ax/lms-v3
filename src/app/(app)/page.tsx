import { FeedFilters } from "@/components/content/feed-filters";
import { getHomeFeedData } from "@/lib/server/data/home-feed";

export default async function HomePage() {
  const data = await getHomeFeedData();
  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">학습 피드</h1>
      <FeedFilters contents={data.contents} categories={data.categories} />
    </div>
  );
}
