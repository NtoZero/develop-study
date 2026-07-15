import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Developer Study · k6 Load Lab',
  description: 'k6 부하 모델과 품질 게이트를 조작하며 배우는 인터랙티브 학습 공간',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
