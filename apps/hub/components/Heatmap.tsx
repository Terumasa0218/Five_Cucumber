'use client';

export interface HeatmapProps {
  data: Array<{
    hour: number;
    matchCount: number;
    averageDuration: number;
    uniquePlayers: number;
  }>;
}

export function Heatmap({ data }: HeatmapProps) {
  const maxMatches = Math.max(...data.map(d => d.matchCount));

  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    return Math.min(1, count / maxMatches);
  };

  const getColor = (intensity: number) => {
    if (intensity === 0) return '#f0f0f0';
    const hue = 120 - (intensity * 120); // Green to red
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="heatmap">
      <div className="heatmap-header">
        <span className="heatmap-label">Low</span>
        <div className="heatmap-legend">
          {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
            <div
              key={intensity}
              className="heatmap-legend-item"
              style={{ backgroundColor: getColor(intensity) }}
            />
          ))}
        </div>
        <span className="heatmap-label">High</span>
      </div>

      <div className="heatmap-grid">
        {data.map((item, index) => {
          const intensity = getIntensity(item.matchCount);
          const color = getColor(intensity);
          
          return (
            <div
              key={index}
              className="heatmap-cell"
              style={{ backgroundColor: color }}
              title={`${item.hour}:00 - ${item.matchCount} matches, ${item.uniquePlayers} players`}
            >
              <div className="heatmap-cell-content">
                <div className="heatmap-cell-hour">{item.hour}</div>
                <div className="heatmap-cell-count">{item.matchCount}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="heatmap-footer">
        <span>Hour of day (24-hour format)</span>
      </div>
    </div>
  );
}
