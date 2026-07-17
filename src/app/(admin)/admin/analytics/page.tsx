"use client";

import {
  AdminPageHeader,
  Panel,
  SparkBars,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminAnalyticsPage() {
  const { data, loading, error } = useAdminJson<{
    dau: number;
    mau: number;
    communityGrowth: number;
    userGrowth: Array<{ date: string; value: number }>;
    postsPerDay: Array<{ date: string; value: number }>;
    videosPerDay: Array<{ date: string; value: number }>;
    messagesPerDay: Array<{ date: string; value: number }>;
    topCountries: Array<{ country: string; count: number }>;
    topDevices: Array<{ device: string; count: number }>;
    popularFeatures: Array<{ feature: string; score: number }>;
  }>("/api/admin/analytics?days=30");

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="User growth, DAU/MAU, posts, videos, communities, messages, and traffic signals."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Daily active users" value={data.dau} />
            <StatCard label="Monthly active users" value={data.mau} />
            <StatCard
              label="Community growth (30d)"
              value={data.communityGrowth}
            />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                User growth
              </h2>
              <div className="mt-4">
                <SparkBars series={data.userGrowth} />
              </div>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Posts / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.postsPerDay} />
              </div>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Videos / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.videosPerDay} />
              </div>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Messages / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.messagesPerDay} />
              </div>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Top countries
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topCountries.map((c) => (
                  <li key={c.country} className="flex justify-between">
                    <span>{c.country}</span>
                    <span>{c.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Top devices
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topDevices.map((d) => (
                  <li key={d.device} className="flex justify-between">
                    <span>{d.device}</span>
                    <span>{d.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel className="lg:col-span-2">
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Popular features
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.popularFeatures.map((f) => (
                  <li
                    key={f.feature}
                    className="flex justify-between rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm"
                  >
                    <span>{f.feature}</span>
                    <span>{f.score}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
