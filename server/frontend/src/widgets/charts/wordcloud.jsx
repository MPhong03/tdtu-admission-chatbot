import { Wordcloud } from "@visx/wordcloud";
import { scaleLog } from "@visx/scale";

const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"];

export default function WordCloudVisx({ words }) {
  const maxValue = Math.max(...words.map(w => w.value));
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center py-8">
      {words.map((word, index) => {
        const fontSize = Math.max(12, (word.value / maxValue) * 48);
        return (
          <span
            key={index}
            className="font-semibold hover:scale-110 transition-transform cursor-pointer"
            style={{
              fontSize: `${fontSize}px`,
              color: colors[index % colors.length]
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}