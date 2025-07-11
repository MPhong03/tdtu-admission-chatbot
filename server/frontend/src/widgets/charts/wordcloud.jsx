import { Wordcloud } from "@visx/wordcloud";
import { scaleLog } from "@visx/scale";

const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"];

export default function WordCloudVisx({ words }) {
  const width = 800;
  const height = 400;

  const fontScale = scaleLog({
    domain: [
      Math.min(...words.map((w) => w.value)),
      Math.max(...words.map((w) => w.value)),
    ],
    range: [12, 60],
  });

  const getRotation = () => (Math.random() > 0.5 ? 0 : 90);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <g>
        <Wordcloud
          words={words}
          width={width}
          height={height}
          font="Impact"
          fontSize={(d) => fontScale(d.value)}
          padding={2}
          spiral="archimedean"
          rotate={getRotation}
          random={() => 0.5}
        >
          {(cloudWords) =>
            cloudWords.map((w, i) => (
              <text
                key={w.text}
                fontSize={w.size}
                transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                textAnchor="middle"
                fill={colors[i % colors.length]}
                fontFamily="Impact"
              >
                {w.text}
              </text>
            ))
          }
        </Wordcloud>
      </g>
    </svg>
  );
}
