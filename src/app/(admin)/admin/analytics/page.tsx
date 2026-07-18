"use client";

import { useEffect, useState } from "react";

import {
  AdminPageHeader,
  Panel,
  SparkBars,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

type AnalyticsPayload = {
  rangeDays: number;
  dau: number;
  mau: number;
  dauMauRatio: number;
  communityGrowth: number;
  retention: {
    d1: { cohortSize: number; returned: number; rate: number };
    d7: { cohortSize: number; returned: number; rate: number };
    d30: { cohortSize: number; returned: number; rate: number };
  };
  engagement: {
    actions: number;
    perActiveUser: number;
    likes: number;
    comments: number;
    shares: number;
  };
  sessions: {
    count: number;
    avgDurationMs: number;
    avgDurationSec: number;
    bounceRate: number;
  };
  screenTime: {
    totalMs: number;
    totalMinutes: number;
    viewsWithDwell: number;
  };
  postReach: number;
  videoViews: number;
  revenue: {
    giftCoins: number;
    giftEvents: number;
    note: string;
  };
  realtime: {
    onlineNow: number;
    viewsLast5m: number;
    postsLast5m: number;
    refreshedAt: string;
  };
  userGrowth: Array<{ date: string; value: number }>;
  activeUsersPerDay: Array<{ date: string; value: number }>;
  postsPerDay: Array<{ date: string; value: number }>;
  videosPerDay: Array<{ date: string; value: number }>;
  storiesPerDay: Array<{ date: string; value: number }>;
  messagesPerDay: Array<{ date: string; value: number }>;
  postViewsPerDay: Array<{ date: string; value: number }>;
  videoViewsPerDay: Array<{ date: string; value: number }>;
  giftCoinsPerDay: Array<{ date: string; value: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topCountriesActive: Array<{ country: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topPosts: Array<{
    id: string;
    type: string;
    preview: string;
    views: number;
    likes: number;
    author: string;
  }>;
  topCreators: Array<{
    userId: string;
    handle: string;
    name: string;
    posts: number;
    views: number;
    likes: number;
    followers: number;
  }>;
  popularFeatures: Array<{ feature: string; score: number }>;
};

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAdminJson<AnalyticsPayload>(
    `/api/admin/analytics?days=${days}`,
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      void reload();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [reload]);

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="DAU/MAU, retention, engagement, sessions, reach, creator insights, and realtime activity for Relune."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
          Range
          <select
            className="ml-2 rounded-xl border border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-xl border border-[var(--mist-strong)] px-3 py-2 text-sm"
        >
          Refresh
        </button>
        <a
          href={`/api/admin/analytics/export?days=${days}`}
          className="rounded-xl bg-[var(--ink)] px-3 py-2 text-sm text-[var(--surface)]"
        >
          Export CSV
        </a>
      </div>

      {loading && !data ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}

      {data ? (
        <>
          <Panel className="mb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                  Realtime
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Auto-refreshes every 60s ·{" "}
                  {new Date(data.realtime.refreshedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <StatCard label="Online now" value={fmt(data.realtime.onlineNow)} />
              <StatCard
                label="Views (5m)"
                value={fmt(data.realtime.viewsLast5m)}
              />
              <StatCard
                label="Posts (5m)"
                value={fmt(data.realtime.postsLast5m)}
              />
            </div>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="DAU"
              value={fmt(data.dau)}
              hint={`${data.dauMauRatio}% of MAU`}
            />
            <StatCard label="MAU" value={fmt(data.mau)} />
            <StatCard
              label="Retention D1 / D7 / D30"
              value={`${data.retention.d1.rate}% / ${data.retention.d7.rate}% / ${data.retention.d30.rate}%`}
              hint={`Cohorts ${data.retention.d1.cohortSize}/${data.retention.d7.cohortSize}/${data.retention.d30.cohortSize}`}
            />
            <StatCard
              label="Engagement / DAU"
              value={fmt(data.engagement.perActiveUser)}
              hint={`${fmt(data.engagement.actions)} actions in range`}
            />
            <StatCard
              label="Sessions"
              value={fmt(data.sessions.count)}
              hint={`Avg ${data.sessions.avgDurationSec}s`}
            />
            <StatCard
              label="Bounce rate"
              value={`${data.sessions.bounceRate}%`}
              hint="Sessions under 30s"
            />
            <StatCard
              label="Screen time"
              value={`${fmt(data.screenTime.totalMinutes)}m`}
              hint={`${fmt(data.screenTime.viewsWithDwell)} dwell samples`}
            />
            <StatCard
              label="Post reach"
              value={fmt(data.postReach)}
              hint={`${fmt(data.videoViews)} video views`}
            />
            <StatCard
              label="Gift coins (basic revenue)"
              value={fmt(data.revenue.giftCoins)}
              hint={`${fmt(data.revenue.giftEvents)} gifts · ${data.revenue.note}`}
            />
            <StatCard
              label="Community growth"
              value={fmt(data.communityGrowth)}
              hint={`${days}d`}
            />
            <StatCard
              label="Likes / comments / shares"
              value={`${fmt(data.engagement.likes)} / ${fmt(data.engagement.comments)} / ${fmt(data.engagement.shares)}`}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Active users / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.activeUsersPerDay} />
              </div>
            </Panel>
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
                Post views / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.postViewsPerDay} />
              </div>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Video views / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.videoViewsPerDay} />
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
                Stories / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.storiesPerDay} />
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
                Gift coins / day
              </h2>
              <div className="mt-4">
                <SparkBars series={data.giftCoinsPerDay} />
              </div>
            </Panel>
            <Panel>
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
                    <span>{fmt(f.score)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Country analytics (all users)
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topCountries.map((c) => (
                  <li key={c.country} className="flex justify-between">
                    <span>{c.country}</span>
                    <span>{fmt(c.count)}</span>
                  </li>
                ))}
                {!data.topCountries.length ? (
                  <li className="text-[var(--muted)]">No country data yet</li>
                ) : null}
              </ul>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Country analytics (active 30d)
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topCountriesActive.map((c) => (
                  <li key={`active-${c.country}`} className="flex justify-between">
                    <span>{c.country}</span>
                    <span>{fmt(c.count)}</span>
                  </li>
                ))}
                {!data.topCountriesActive.length ? (
                  <li className="text-[var(--muted)]">No active-country data yet</li>
                ) : null}
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
                    <span>{fmt(d.count)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Creator analytics
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topCreators.map((c) => (
                  <li key={c.userId} className="flex justify-between gap-3">
                    <span className="truncate">
                      @{c.handle} · {c.posts} posts · {fmt(c.followers)} followers
                    </span>
                    <span className="shrink-0">
                      {fmt(c.views)} views · {fmt(c.likes)} likes
                    </span>
                  </li>
                ))}
                {!data.topCreators.length ? (
                  <li className="text-[var(--muted)]">No creator activity in range</li>
                ) : null}
              </ul>
            </Panel>
            <Panel className="lg:col-span-2">
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Top posts by reach
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topPosts.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      @{p.author} · {p.type}
                      {p.preview ? ` · ${p.preview}` : ""}
                    </span>
                    <span className="shrink-0">
                      {fmt(p.views)} views · {fmt(p.likes)} likes
                    </span>
                  </li>
                ))}
                {!data.topPosts.length ? (
                  <li className="text-[var(--muted)]">No posts in range</li>
                ) : null}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
