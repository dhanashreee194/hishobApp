import React from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Svg, {Circle, Line, Polyline, Text as SvgText} from 'react-native-svg';
import {colors, fonts, spacing} from '../theme';

export type ChartPoint = {
  label: string;
  value: number;
};

export type ChartSeries = {
  name: string;
  points: ChartPoint[];
};

const SERIES_COLORS = [colors.primary, colors.accent, '#2F5D8C', '#6B4C2A', colors.success];

type LineChartProps = {
  data: Array<{value: number; label?: string}>;
  width: number;
  height: number;
  spacing: number;
  color: string;
  thickness: number;
  hideDataPoints?: boolean;
  dataPointsColor?: string;
  yAxisColor?: string;
  xAxisColor?: string;
  rulesColor?: string;
  yAxisTextStyle?: object;
  xAxisLabelTextStyle?: object;
  noOfSections?: number;
  mostNegativeValue?: number;
  curved?: boolean;
  isAnimated?: boolean;
  initialSpacing?: number;
  endSpacing?: number;
};

function loadGiftedLineChart(): ((props: LineChartProps) => React.ReactElement) | null {
  try {
    const charts = require('react-native-gifted-charts') as {
      LineChart?: (props: LineChartProps) => React.ReactElement;
      default?: {LineChart?: (props: LineChartProps) => React.ReactElement};
    };
    if (!charts) {
      return null;
    }
    return charts.LineChart ?? charts.default?.LineChart ?? null;
  } catch {
    return null;
  }
}

const GiftedLineChart = loadGiftedLineChart();

export function TrendChart({points, series}: {points?: ChartPoint[]; series?: ChartSeries[]}) {
  const {width} = useWindowDimensions();
  const drawn =
    series && series.some(item => item.points.length > 0)
      ? series.filter(item => item.points.length > 0)
      : points && points.length > 0
        ? [{name: '', points}]
        : [];
  if (drawn.length === 0) {
    return null;
  }
  const sample = drawn[0].points;
  const spacingX = sample.length > 16 ? 36 : 48;
  const chartWidth = Math.max(width - 88, spacingX * sample.length);

  if (drawn.length === 1 && GiftedLineChart) {
    const only = drawn[0].points;
    const lowest = Math.min(...only.map(point => point.value), 0);
    const labelEvery = Math.max(1, Math.ceil(only.length / 6));
    return (
      <View style={styles.wrap}>
        <GiftedLineChart
          data={only.map((point, index) => ({
            value: point.value,
            label: index % labelEvery === 0 ? point.label : '',
          }))}
          width={chartWidth}
          height={180}
          spacing={spacingX}
          color={SERIES_COLORS[0]}
          thickness={3}
          hideDataPoints={only.length > 18}
          dataPointsColor={colors.accent}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={colors.border}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          noOfSections={4}
          mostNegativeValue={lowest < 0 ? lowest : undefined}
          curved={only.length > 1 && only.length < 18}
          isAnimated={false}
          initialSpacing={16}
          endSpacing={16}
        />
        {drawn[0].name ? <Legend series={drawn} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SvgTrend series={drawn} width={Math.max(chartWidth + 56, width - 32)} />
      {drawn.some(item => item.name) ? <Legend series={drawn} /> : null}
    </View>
  );
}

function Legend({series}: {series: ChartSeries[]}) {
  return (
    <View style={styles.legend}>
      {series.map((item, index) => (
        <View key={item.name || String(index)} style={styles.legendItem}>
          <View style={[styles.swatch, {backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length]}]} />
          <Text style={styles.legendLabel}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

function SvgTrend({series, width}: {series: ChartSeries[]; width: number}) {
  const height = 180;
  const padLeft = 48;
  const padBottom = 28;
  const padTop = 12;
  const labels = series.reduce((longest, item) =>
    item.points.length > longest.length ? item.points : longest,
  series[0].points);
  const values = series.flatMap(item => item.points.map(point => point.value));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const innerWidth = Math.max(width - padLeft - 8, 40);
  const innerHeight = height - padTop - padBottom;
  const step = labels.length === 1 ? 0 : innerWidth / (labels.length - 1);
  const labelEvery = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <Svg width={width} height={height}>
      <Line
        x1={padLeft}
        y1={padTop}
        x2={padLeft}
        y2={height - padBottom}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Line
        x1={padLeft}
        y1={height - padBottom}
        x2={width - 8}
        y2={height - padBottom}
        stroke={colors.border}
        strokeWidth={1}
      />
      {series.map((item, seriesIndex) => {
        const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
        const coords = item.points.map((point, index) => {
          const x = padLeft + index * step;
          const y = padTop + ((max - point.value) / span) * innerHeight;
          return `${x},${y}`;
        });
        return (
          <Polyline
            key={item.name || String(seriesIndex)}
            points={coords.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={3}
          />
        );
      })}
      {labels.map((point, index) => {
        if (index % labelEvery !== 0) {
          return null;
        }
        const x = padLeft + index * step;
        return (
          <SvgText
            key={`${point.label}-${index}`}
            x={x}
            y={height - 8}
            fontSize={11}
            fill={colors.textMuted}
            textAnchor="middle"
            fontFamily={fonts.regular}>
            {point.label}
          </SvgText>
        );
      })}
      {labels.length === 1 ? (
        <Circle
          cx={padLeft}
          cy={padTop + ((max - labels[0].value) / span) * innerHeight}
          r={3.5}
          fill={SERIES_COLORS[0]}
        />
      ) : null}
      <SvgText x={4} y={padTop + 10} fontSize={11} fill={colors.textMuted} fontFamily={fonts.regular}>
        {formatAxis(max)}
      </SvgText>
      <SvgText x={4} y={height - padBottom} fontSize={11} fill={colors.textMuted} fontFamily={fonts.regular}>
        {formatAxis(min)}
      </SvgText>
    </Svg>
  );
}

function formatAxis(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(0);
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  axis: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
});
