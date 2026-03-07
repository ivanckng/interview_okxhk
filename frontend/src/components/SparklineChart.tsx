import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
}

export const SparklineChart = ({ data, width = 120, height = 40, isPositive = true }: SparklineChartProps) => {
  const chartData = data.map((value, index) => ({ value, index }));
  // OKX style colors
  const color = isPositive ? '#00c087' : '#f6465d';

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={['auto', 'auto']} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
