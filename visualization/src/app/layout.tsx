import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Developer Study · 깊이 있는 기술 학습',
  description: '공식 근거를 바탕으로 시스템의 원리와 설계 판단을 설명하는 인터랙티브 기술 아티클',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
