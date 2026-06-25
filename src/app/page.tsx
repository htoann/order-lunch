import { getSessionData } from "@/lib/actions";
import OrderTable from "@/components/OrderTable";
import ManagePanel from "@/components/ManagePanel";
import ImagePanel from "@/components/ImagePanel";

type SearchParams = Promise<{ date?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const dateStr = params.date || today;
  const { session, members, dishes, debts } = await getSessionData(dateStr);

  const images = session?.images ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          Order Lunch Tracker
        </h1>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <OrderTable
              dateStr={dateStr}
              session={session}
              members={members}
              dishes={dishes}
              debts={debts}
            />
          </div>

          <div className="w-full lg:w-72 xl:w-80">
            <ImagePanel dateStr={dateStr} images={images} />
          </div>
        </div>

        <ManagePanel />
      </div>
    </div>
  );
}
