import { getSessionData, getActivities } from "@/lib/actions";
import OrderTable from "@/components/OrderTable";
import ManagePanel from "@/components/ManagePanel";
import ImagePanel from "@/components/ImagePanel";
import ActivityPanel from "@/components/ActivityPanel";
import AdminProvider from "@/components/AdminProvider";
import AdminButton from "@/components/AdminButton";
import FeedbackButton from "@/components/FeedbackButton";
import ToastProvider from "@/components/ToastProvider";
import ConfirmProvider from "@/components/ConfirmProvider";

type SearchParams = Promise<{ date?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const dateStr = params.date || today;
  const [{ session, members, dishes, debts, paid }, activities] =
    await Promise.all([getSessionData(dateStr), getActivities()]);

  const images = session?.images ?? [];

  return (
    <ToastProvider>
    <ConfirmProvider>
    <AdminProvider>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl shadow-sm">
                🍱
              </span>
              <div>
                <h1 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                  Order Lunch Tracker
                </h1>
                <p className="hidden text-sm text-gray-500 sm:block">
                  Theo dõi đặt cơm trưa của nhóm
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FeedbackButton />
              <AdminButton />
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="order-3 w-full lg:order-1 lg:w-64 xl:w-72">
              <ActivityPanel activities={activities} />
            </div>

            <div className="order-1 min-w-0 flex-1 lg:order-2">
              <OrderTable
                dateStr={dateStr}
                session={session}
                members={members}
                dishes={dishes}
                debts={debts}
                paid={paid}
              />
            </div>

            <div className="order-2 w-full lg:order-3 lg:w-72 xl:w-80">
              <ImagePanel dateStr={dateStr} images={images} />
            </div>
          </div>

          <ManagePanel members={members} dishes={dishes} />
        </div>
      </div>
    </AdminProvider>
    </ConfirmProvider>
    </ToastProvider>
  );
}
