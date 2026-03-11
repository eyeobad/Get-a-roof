"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function MatchTrendChart({
  matchesData,
  className = "",
}: {
  matchesData: number[];
  className?: string;
}) {
  const data: ChartData<"line"> = useMemo(() => {
    // Generate dates for the last 7 days
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short" });
    });

    // If matchesData isn't provided or is empty, use some dummy data for now
    // until the backend historical matches API is ready to provide precise stats.
    const actualData = matchesData?.length === 7 ? matchesData : [0, 0, 0, 0, 0, 0, 0];

    return {
      labels,
      datasets: [
        {
          label: "Profile Views & Matches",
          data: actualData,
          borderColor: "#0a44b8",
          backgroundColor: "rgba(10, 68, 184, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [matchesData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#1e293b",
        bodyColor: "#475569",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#94a3b8",
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "#f1f5f9",
          drawTicks: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#94a3b8",
          padding: 10,
          font: {
            size: 11,
          },
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  return (
    <div className={`h-64 w-full ${className}`.trim()}>
      <Line data={data} options={options} />
    </div>
  );
}

export function PropertyPerformanceChart({
  propertyData,
  className = "",
}: {
  propertyData: { title: string; matches: number }[];
  className?: string;
}) {
  const data: ChartData<"bar"> = useMemo(() => {
    // Limit to top 5 properties for clearer visualization
    const topProperties = [...propertyData]
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 5);

    const labels = topProperties.map((p) => p.title.length > 15 ? p.title.substring(0, 15) + "..." : p.title) || ["No listings"];
    const actualData = topProperties.map((p) => p.matches) || [0];

    return {
      labels,
      datasets: [
        {
          label: "Matches",
          data: actualData,
          backgroundColor: "#0a44b8",
          borderRadius: 6,
          barPercentage: 0.5,
        },
      ],
    };
  }, [propertyData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#1e293b",
        bodyColor: "#475569",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#94a3b8",
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "#f1f5f9",
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#94a3b8",
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={`h-64 w-full ${className}`.trim()}>
      <Bar data={data} options={options} />
    </div>
  );
}
