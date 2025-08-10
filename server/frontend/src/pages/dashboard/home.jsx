import { useState, useEffect } from "react";
import {
  UserGroupIcon,
  CursorArrowRaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { StatisticsCard } from "@/widgets/cards";
import { StatisticsChart } from "@/widgets/charts";
import api from "@/configs/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import WordCloudVisx from "@/widgets/charts/wordcloud";
import { ChartBarIcon, FunnelIcon } from "@heroicons/react/24/solid";

export function Home() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [qaByDay, setQaByDay] = useState([]);
  const [qaByStatus, setQaByStatus] = useState([]);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [verificationStats, setVerificationStats] = useState(null);
  const [verificationScoreByDay, setVerificationScoreByDay] = useState([]);

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
      const [summaryRes, byDayRes, byStatusRes, wordCloudRes, verificationRes, verificationScoreRes] = await Promise.all([
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
        api.get("/statistics/word-cloud", {
          params: {
            startDate: startDate?.toISOString().split("T")[0],
            endDate: endDate?.toISOString().split("T")[0],
          },
        }),
        api.get("/statistics/verification", {
          params: {
            startDate: startDate?.toISOString().split("T")[0],
            endDate: endDate?.toISOString().split("T")[0],
          },
        }),
        api.get("/statistics/verification-score-by-day", {
          params: {
            startDate: startDate?.toISOString().split("T")[0],
            endDate: endDate?.toISOString().split("T")[0],
          },
        }),
      ]);
      setStatistics(summaryRes.data.Data);
      setQaByDay(byDayRes.data.Data);
      setQaByStatus(byStatusRes.data.Data);
      setWordCloudData(
        wordCloudRes.data.Data.map(w => ({ text: w.word, value: w.count }))
      );
      // Lưu verification stats để sử dụng trong cards
      setVerificationStats(verificationRes.data.Data);
      setVerificationScoreByDay(verificationScoreRes.data.Data);
    } catch (error) {
      console.error("Lỗi khi gọi API thống kê:", error);
    }
  };

  return (
    <div className="mt-6 px-4">
      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-300 mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Bộ lọc thời gian</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
              <input
                type="date"
                value={startDate?.toISOString().split("T")[0] || ""}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
              <input
                type="date"
                value={endDate?.toISOString().split("T")[0] || ""}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 flex justify-start md:justify-end">
              <button
                onClick={fetchStatistics}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <FunnelIcon className="w-4 h-4" />
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
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
              value={verificationStats ? `${(verificationStats.correctRate * 100).toFixed(1)}%` : `${(statistics.successRate * 100).toFixed(1)}%`}
            />
            <StatisticsCard
              color="red"
              icon={<XCircleIcon className="w-6 h-6 text-white" />}
              title="Tỷ lệ trả lời sai"
              value={verificationStats ? `${(verificationStats.incorrectRate * 100).toFixed(1)}%` : `${(statistics.errorRate * 100).toFixed(1)}%`}
            />
          </>
        )}
      </div>

      {/* Verification Stats Row */}
      {verificationStats && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <StatisticsCard
            color="blue"
            icon={<ClockIcon className="w-6 h-6 text-white" />}
            title="Đang chờ xác thực"
            value={`${(verificationStats.pendingRate * 100).toFixed(1)}%`}
          />
          <StatisticsCard
            color="gray"
            icon={<ExclamationTriangleIcon className="w-6 h-6 text-white" />}
            title="Bỏ qua xác thực"
            value={`${(verificationStats.skippedRate * 100).toFixed(1)}%`}
          />
          <StatisticsCard
            color="green"
            icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
            title="Đã xác thực đúng"
            value={verificationStats.correct}
          />
          <StatisticsCard
            color="red"
            icon={<XCircleIcon className="w-6 h-6 text-white" />}
            title="Đã xác thực sai"
            value={verificationStats.incorrect}
          />
        </div>
      )}

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
          key={JSON.stringify(qaByStatus)}
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

      {/* Verification Score Chart */}
      {verificationScoreByDay.length > 0 && (
        <div className="grid grid-cols-1 gap-6 mb-12">
          <StatisticsChart
            chart={{
              type: "line",
              height: 320,
              series: [{ 
                name: "Điểm xác thực trung bình", 
                data: verificationScoreByDay.map((d) => (d.averageScore * 100).toFixed(1)) 
              }],
              options: {
                chart: { toolbar: { show: false } },
                xaxis: { categories: verificationScoreByDay.map((d) => d._id) },
                yaxis: { 
                  title: { text: "Điểm (%)" },
                  min: 0,
                  max: 100
                },
                dataLabels: { enabled: true },
                colors: ["#10B981"],
              },
            }}
            title="Điểm xác thực trung bình theo ngày"
            description="Biểu đồ điểm xác thực trung bình của các câu trả lời theo từng ngày"
          />
        </div>
      )}

      {/* Word Cloud */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-300">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Tần suất từ khóa</h3>
          </div>
          {wordCloudData.length > 0 ? (
            <WordCloudVisx words={wordCloudData} />
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <ChartBarIcon className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500">Không có dữ liệu từ khóa để hiển thị.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
