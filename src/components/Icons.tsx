import React from 'react';
import Svg, {Path} from 'react-native-svg';

type Props = {
  color: string;
  size?: number;
};

function Glyph({color, size = 24, d}: Props & {d: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill={color} />
    </Svg>
  );
}

export function HomeIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M12 3.2 3 11.1V21h6.2v-6.2h5.6V21H21V11.1L12 3.2z"
    />
  );
}

export function VegIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M12 21.2C7.2 17.4 3.5 13.6 3.5 9.2 3.5 5.6 6.2 3.4 9.4 3.8c1.2-1.5 3.4-1.6 4.8-.2 2.6-.6 5.3.8 5.8 3.6 1.6.2 2.8 1.6 2.8 3.4 0 4.6-5.2 8.8-10.8 10.6z"
    />
  );
}

export function MillIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M4 20.5V10.2L12 3.5l8 6.7v10.3H4zm4.2-1.6h2.4v-4.2h3.2v4.2h2.4V11L12 6.4 8.2 11v8z"
    />
  );
}

export function CreditIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M3.5 6.5h17v11h-17v-11zm2 2.2v1.8h13V8.7h-13zm0 4.2v2.2h6v-2.2h-6z"
    />
  );
}

export function ReportsIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M4 19.5h16v-2H4v2zm1.5-3.2h3.2V8.5H5.5v7.8zm5.4 0h3.2V4.5h-3.2v11.8zm5.4 0H20v-5.2h-3.7v5.2z"
    />
  );
}

export function ProfileIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M12 12.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM5 19.6c.6-3.2 3.2-5.1 7-5.1s6.4 1.9 7 5.1H5z"
    />
  );
}

export function LockIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M8 10.2V8.2a4 4 0 0 1 8 0v2h1.2v9.2H6.8V10.2H8zm2 0h4V8.2a2 2 0 0 0-4 0v2z"
    />
  );
}

export function ListIcon(props: Props) {
  return (
    <Glyph
      {...props}
      d="M5 6.2h2.2V8.4H5V6.2zm3.6 0H19v2.2H8.6V6.2zM5 11h2.2v2.2H5V11zm3.6 0H19v2.2H8.6V11zM5 15.8h2.2v2.2H5v-2.2zm3.6 0H19v2.2H8.6v-2.2z"
    />
  );
}
