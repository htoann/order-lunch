import { getSessionData } from "@/lib/actions";
import OrderTable from "@/components/OrderTable";
import ManagePanel from "@/components/ManagePanel";

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          Order Lunch Tracker
        </h1>

        <OrderTable
          dateStr={dateStr}
          session={session}
          members={members}
          dishes={dishes}
          debts={debts}
        />

        <ManagePanel />
      </div>
    </div>
  );
}
