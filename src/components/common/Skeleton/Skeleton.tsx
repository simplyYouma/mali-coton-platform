import type { CSSProperties } from 'react';
import clsx from 'clsx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
}

export function Skeleton({ width, height, radius, circle = false, className }: SkeletonProps) {
  const style: CSSProperties = {
    width,
    height,
    borderRadius: circle ? '50%' : radius,
  };
  return <span aria-hidden="true" className={clsx(styles.skeleton, className)} style={style} />;
}
