import { useState, useEffect } from "react";
import {
  UserGroupIcon,
  CursorArrowRaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { StatisticsCard } from "@/widgets/cards";
import { StatisticsChart } from "@/widgets/charts";
import api from "@/configs/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export function Home() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [qaByDay, setQaByDay] = useState([]);
  const [qaByStatus, setQaByStatus] = useState([]);

  // Hàm lấy ngày đầu & cuối tháng
  const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { firstDay, lastDay };
  };

  useEffect(() => {
    const { firstDay, lastDay } = getDefaultDateRange();
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  useEffect(() => {
    if (startDate && endDate) fetchStatistics();
  }, [startDate, endDate]);

  const fetchStatistics = async () => {
    try {
      const [summaryRes, byDayRes, byStatusRes] = await Promise.all([
        api.get("/statistics/summary", {
          params: {
            startDate: startDate?.toISOString().split("T")[0],
            endDate: endDate?.toISOString().split("T")[0],
          },
        }),
        api.get("/statistics/qa-by-day", {
          params: {
            startDate: startDate?.toISOString().split("T")[0],
            endDate: endDate?.toISOString().split("T")[0],
          },
        }),
        api.get("/statistics/qa-by-status", {
          params: {
            startDate: startDate?.toISOString().split("T")[0],
            endDate: endDate?.toISOString().split("T")[0],
          },
        }),
      ]);
      setStatistics(summaryRes.data.Data);
      setQaByDay(byDayRes.data.Data);
      setQaByStatus(byStatusRes.data.Data);
    } catch (error) {
      console.error("Lỗi khi gọi API thống kê:", error);
    }
  };

  return (
    <div className="mt-6 px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-4 rounded-lg shadow border mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            className="w-full px-3 py-2 border rounded-md"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="w-full px-3 py-2 border rounded-md"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div className="md:col-span-2 flex justify-start md:justify-end">
          <button
            onClick={fetchStatistics}
            className="px-5 py-2 bg-black hover:bg-gray-700 text-white font-semibold rounded-md"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-6">
        {statistics && (
          <>
            <StatisticsCard
              color="light-blue"
              icon={<UserGroupIcon className="w-6 h-6 text-white" />}
              title="Tổng người dùng"
              value={statistics.totalUsers}
            />
            <StatisticsCard
              color="green"
              icon={<CursorArrowRaysIcon className="w-6 h-6 text-white" />}
              title="Tổng tương tác"
              value={statistics.totalInteractions}
            />
            <StatisticsCard
              color="amber"
              icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
              title="Tỷ lệ trả lời đúng"
              value={`${(statistics.successRate * 100).toFixed(1)}%`}
            />
            <StatisticsCard
              color="red"
              icon={<XCircleIcon className="w-6 h-6 text-white" />}
              title="Tỷ lệ lỗi"
              value={`${(statistics.errorRate * 100).toFixed(1)}%`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* {qaByDay.length > 0 && ( */}
          <StatisticsChart
            chart={{
              type: "bar",
              height: 320,
              series: [{ name: "Số câu hỏi", data: qaByDay.map((d) => d.count) }],
              options: {
                chart: { toolbar: { show: false } },
                xaxis: { categories: qaByDay.map((d) => d._id) },
                dataLabels: { enabled: true },
              },
            }}
            title="Số câu hỏi theo ngày"
            description="Biểu đồ số lượng câu hỏi được hỏi theo từng ngày"
          />
        {/* )} */}

        {/* {qaByStatus.length > 0 && ( */}
          <StatisticsChart
            chart={{
              type: "donut",
              height: 320,
              series: qaByStatus.map((s) => s.count),
              options: {
                labels: qaByStatus.map((s) => s._id),
                legend: { position: "bottom" },
                dataLabels: { formatter: (val) => `${val.toFixed(1)}%` },
              },
            }}
            title="Số câu hỏi theo trạng thái"
            description="Phân loại câu hỏi theo trạng thái xử lý"
          />
        {/* )} */}
      </div>
    </div>
  );
}

export default Home;
